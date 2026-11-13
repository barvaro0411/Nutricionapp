# Especificación de Diseño: Sub-proyecto 1 — Restricciones Dietéticas Sincronizadas y Coach/Escáner Conscientes

**Fecha:** 2026-11-12  
**Estado:** Aprobado para Planificación e Implementación  
**Autor:** Antigravity & Usuario  

---

## 1. Resumen y Contexto

Actualmente en Nutricionapp, las preferencias y restricciones alimentarias (`DietaryRestriction`) definidas en [`src/types/profile.ts`](../../../src/types/profile.ts) se almacenan únicamente en el almacenamiento local del dispositivo (`localStorage` en Web o `SecureStore` en nativo) mediante [`src/services/dietaryPreferencesService.ts`](../../../src/services/dietaryPreferencesService.ts). Esto genera tres brechas reales:

1. No se sincronizan entre dispositivos ni sobreviven a la limpieza del navegador o reinstalación.
2. Solo admiten 8 restricciones predefinidas sin permitir alergias o alimentos a evitar en texto libre (por ejemplo: *"huevo"*, *"soya"*, *"champiñones"*).
3. El contexto del Coach IA ([`supabase/functions/_shared/coachContext.ts`](../../../supabase/functions/_shared/coachContext.ts)) y las funciones de análisis ([`analyze-meal`](../../../supabase/functions/analyze-meal/index.ts), [`parse-meal-text`](../../../supabase/functions/parse-meal-text/index.ts), [`coach-live-session`](../../../supabase/functions/coach-live-session/index.ts)) no reciben estas preferencias del usuario.

Este sub-proyecto convierte las restricciones dietéticas y alergias personalizadas en datos persistentes en PostgreSQL (`public.profiles`), extiende el motor local de alertas y recetas, agrega su configuración opcional al onboarding y ajustes, e inyecta el contexto de restricciones de forma segura y compacta en las Edge Functions de IA.

---

## 2. Objetivos y No Objetivos

### Objetivos
- Persistir `dietary_restrictions` (8 códigos válidos) y `custom_allergies` (hasta 15 términos libres, 1–60 caracteres cada uno) en `public.profiles` con validación `CHECK` en PostgreSQL.
- Mantener compatibilidad retroactiva de `public.complete_onboarding(p_profile, p_goals)` aceptando opcionalmente restricciones y alergias personalizadas.
- Sincronizar bidireccionalmente las preferencias en [`src/services/dietaryPreferencesService.ts`](../../../src/services/dietaryPreferencesService.ts) con respaldo offline local y migración única transparente de preferencias locales previas.
- Extender [`src/utils/foodAlerts.ts`](../../../src/utils/foodAlerts.ts) (`detectDietaryAlerts`, `evaluateFoodAlerts`, `isRecipeCompatible`) para detectar coincidencias con `customAllergies` (sin tildes, tolerancia singular/plural básica y exenciones `"sin <alérgeno>"` / `"libre de <alérgeno>"`).
- Reutilizar un componente compartido [`DietaryPreferencesSection`](../../../src/components/common/DietaryPreferencesSection.tsx) en Ajustes (`app/(tabs)/settings.tsx`) y en Onboarding (`app/(onboarding)/profile-setup.tsx`).
- Mostrar alerta consolidada en [`app/meal/review.tsx`](../../../app/meal/review.tsx) antes de guardar si algún alimento choca con restricciones o alergias del usuario, y pasar `customAllergies` a [`MealReviewItemCard`](../../../src/components/meal/MealReviewItemCard.tsx), [`ScannedProductSheet`](../../../src/components/meal/barcode/ScannedProductSheet.tsx) y pantallas de recetas (`app/recipes/index.tsx`, `app/recipes/[id].tsx`).
- Inyectar las preferencias en [`coachContext.ts`](../../../supabase/functions/_shared/coachContext.ts) y [`coachPrompt.ts`](../../../supabase/functions/_shared/coachPrompt.ts) (cubriendo `nutrition-coach` y `coach-live-session`), y entregar contexto compacto *best-effort* en `analyze-meal` y `parse-meal-text` sin romper el prompt compacto de Groq (`GROQ_MEAL_VISION_PROMPT`) ni añadir llamadas `rpc` adicionales.

### No Objetivos
- No se implementa todavía el generador dinámico de recetas ni el plan personal dinámico (corresponden a los Sub-proyectos 2 y 3).
- No se bloquea el guardado de una comida si el usuario decide registrarla a pesar de una advertencia dietética (la alerta es preventiva/informativa, no restrictiva).
- No se introducen tablas nuevas ni políticas RLS adicionales fuera de `public.profiles`.

---

## 3. Modelo de Datos y Migración SQL

### 3.1. Migración `supabase/migrations/20261112000000_dietary_preferences_sync.sql`
1. Añadir columnas a `public.profiles`:
   - `dietary_restrictions text[] NOT NULL DEFAULT '{}'`
   - `custom_allergies text[] NOT NULL DEFAULT '{}'`
2. Añadir restricciones `CHECK` idempotentes:
   - `profiles_dietary_restrictions_valid`: no contiene `NULL`, máximo 8 elementos y es subconjunto de los 8 códigos de `DietaryRestrictionSchema`.
   - `profiles_custom_allergies_bounded`: no contiene `NULL` y máximo 15 elementos (`coalesce(array_length(custom_allergies, 1), 0) <= 15`).
   - Trigger `BEFORE INSERT OR UPDATE` (`public.validate_profile_dietary_preferences()` con `SET search_path = ''`) que recorta espacios de cada elemento en `custom_allergies`, descarta vacíos/duplicados (insensible a mayúsculas) y rechaza con `22023` cualquier elemento que supere 60 caracteres.
3. Actualizar `public.complete_onboarding(p_profile jsonb, p_goals jsonb)`:
   - Si `p_profile ? 'dietary_restrictions'`, validar que sea un arreglo JSON de códigos válidos y actualizar `dietary_restrictions`.
   - Si `p_profile ? 'custom_allergies'`, validar que sea un arreglo JSON de hasta 15 textos válidos (1–60 caracteres) y actualizar `custom_allergies`.
   - Si las claves no vienen en `p_profile`, conservar los valores actuales de `profiles`.
4. Emitir `NOTIFY pgrst, 'reload schema';`.

### 3.2. Tipos en Cliente (`src/types/database.types.ts` y `src/types/profile.ts`)
- En `Database["public"]["Tables"]["profiles"]` (`Row`, `Insert`, `Update`): agregar `dietary_restrictions?: string[] | null;` y `custom_allergies?: string[] | null;` (opcionales para compatibilidad con fixtures existentes).
- En `src/types/profile.ts`:
  - `CUSTOM_ALLERGY_MAX_ITEMS = 15`
  - `CUSTOM_ALLERGY_MAX_LENGTH = 60`
  - `DietaryPreferences = { restrictions: DietaryRestriction[]; customAllergies: string[] }`
  - `normalizeDietaryRestrictions(values: unknown): DietaryRestriction[]`
  - `normalizeCustomAllergies(values: unknown): string[]`

---

## 4. Sincronización Cliente, Alertas y Pantallas

### 4.1. Servicio `src/services/dietaryPreferencesService.ts` y Hook `src/hooks/useDietaryPreferences.ts`
- Almacenamiento local (`dietary_prefs_v2_<userId>` + soporte de lectura legado `dietary_prefs_<userId>` y marcador `dietary_prefs_migrated_<userId>`).
- `getDietaryPreferencesSnapshot(userId?)`:
  - Si `userId` existe, consulta `profiles` (`select("dietary_restrictions, custom_allergies").eq("id", userId).maybeSingle()`), normaliza los arreglos y actualiza el caché local.
  - Si la consulta remota retorna ambos arreglos vacíos y existe caché local previo aún no migrado (`migrated !== "1"`), sube esos datos una sola vez a `profiles` y marca la migración completada.
  - Si falla la red o no hay sesión, retorna el caché local de manera resiliente.
- `saveDietaryPreferencesSnapshot(prefs, userId?)`:
  - Normaliza `{ restrictions, customAllergies }`, guarda inmediatamente en caché local y, si hay `userId`, actualiza `public.profiles` (`update({ dietary_restrictions, custom_allergies, updated_at }).eq("id", userId).select().single()`) sincronizando también `useAuthStore.getState().setProfile(...)`.
- Mantener `getDietaryPreferences` y `saveDietaryPreferences` como adaptadores compatibles hacia atrás.
- `useDietaryPreferences()` expone `{ restrictions, customAllergies, isLoading, isSaving, toggleRestriction, hasRestriction, addCustomAllergy, removeCustomAllergy, saveAllPreferences }`.

### 4.2. Motor de Alertas (`src/utils/foodAlerts.ts`)
- Extender `FoodDietaryAlert.type` a `DietaryRestriction | "custom_allergy"`.
- `detectDietaryAlerts(foodName, nutrients, userRestrictions = [], customAllergies = [])`:
  - Evalúa primero los 8 códigos estándar y luego cada término de `customAllergies` mediante normalización sin tildes, coincidencia por límites de palabra con tolerancia singular/plural (`s` / `es`) y exención explícita si aparece `"sin <alérgeno>"` o `"libre de <alérgeno>"`.
- `evaluateFoodAlerts(item, userRestrictions = [], customAllergies = [])` e `isRecipeCompatible(recipe, userRestrictions = [], customAllergies = [])` propagan `customAllergies`.

### 4.3. Componentes y Pantallas
- Nuevo componente `src/components/common/DietaryPreferencesSection.tsx` con:
  - Grilla de las 8 restricciones predefinidas.
  - Campo + botón `"Agregar"` para alergias o ingredientes a evitar en texto libre (muestra chips removibles y validación amigable de límite o duplicado).
- `app/(tabs)/settings.tsx`: usa `DietaryPreferencesSection` conectado a `useDietaryPreferences`.
- `app/(onboarding)/profile-setup.tsx` y `app/(onboarding)/goals-review.tsx`:
  - Sección opcional de preferencias/alergias en `profile-setup.tsx` inicializada con `useDietaryPreferences()`.
  - Envío en parámetros hacia `goals-review.tsx` y persistencia atómica dentro de `complete_onboarding`, invalidando `["dietaryPreferences"]` al guardar.
- `app/meal/review.tsx`, `src/components/meal/MealReviewItemCard.tsx`, `app/meal/barcode.tsx`, `src/components/meal/barcode/ScannedProductSheet.tsx`, `app/recipes/index.tsx` y `app/recipes/[id].tsx`: propagar `customAllergies` y mostrar banner consolidado de advertencia en `review.tsx` cuando existan conflictos.

---

## 5. Edge Functions Conscientes de Restricciones

1. **`supabase/functions/_shared/dietaryPreferences.ts`**:
   - Mapa de etiquetas en español de las 8 restricciones.
   - `extractDietaryPreferences(profile)` devuelve `{ restrictions: string[], customAllergies: string[] } | null`.
   - `formatCompactDietaryNote(prefs)` genera una línea compacta en español (máximo ~220 caracteres).
   - `loadUserDietaryPreferencesBestEffort(client, userId)` consulta `profiles` únicamente si `typeof client?.from === "function"`, dentro de `try/catch`, sin añadir llamadas `rpc`.
2. **Coach (`coachContext.ts`, `coachPrompt.ts`, `nutrition-coach`, `coach-live-session`)**:
   - `loadCoachContext` incluye `dietary_restrictions, custom_allergies` en la consulta existente de `profiles` cuando `scope === "full"`.
   - Solo incluye `dietaryPreferences` en el objeto `context` cuando existe al menos una restricción o alergia.
   - `COACH_SYSTEM_PROMPT` instruye respetar estrictamente `dietaryPreferences` al sugerir alimentos y acciones `<!--coach-action:...-->`.
3. **Escáner y Texto (`analyze-meal`, `parse-meal-text`)**:
   - `analyze-meal`: mantiene intacta la referencia exacta `CHILEAN_MEAL_VISION_PROMPT` para preservar el cambio a `GROQ_MEAL_VISION_PROMPT` en `GroqVisionProvider`. Pasa `dietary_preferences` en la carga útil JSON del mensaje de usuario (`client_time_iso`, `user_note`, `dietary_preferences`) solo si el usuario tiene restricciones, indicando desambiguar únicamente lo ambiguo sin omitir alimentos reales visibles.
   - `parse-meal-text`: en análisis estructurado (`!transcribe_only`), cuando existen preferencias, añade una nota breve en el mensaje del usuario (no en el prompt del sistema base) para desambiguar casos dudosos sin ocultar ingredientes declarados.

---

## 6. Plan de Verificación

- Pruebas unitarias Jest en cliente:
  - `src/utils/__tests__/foodAlerts.test.ts`: detección de `customAllergies`, plurales, acentos y exenciones `"sin ..."`.
  - `src/services/__tests__/dietaryPreferencesService.test.ts`: lectura desde Supabase, escritura sincronizada, migración única de caché legado y fallback offline.
- Pruebas contractuales de Edge Functions (`supabase/functions/__tests__/providerHandlers.test.js` y `handlers.test.js`):
  - Verificación de inyección condicional de `dietaryPreferences` en `nutrition-coach` y preservación de `1` sola llamada `rpc` por petición y sin fugas en `analyze-meal` / `parse-meal-text`.
- Suite completa:
  - `npm run type-check`
  - `npm run lint`
  - `npm test -- --runInBand`
  - `npx deno check --config supabase/functions/deno.json ...`
  - `npm run build:pwa`
