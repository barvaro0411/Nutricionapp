# Sub-proyecto 1: Restricciones Dietéticas Sincronizadas y Coach/Escáner Conscientes — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir restricciones dietéticas y alergias personalizadas en Supabase (`public.profiles`), sincronizarlas bidireccionalmente con caché offline en cliente, exponerlas en Ajustes/Onboarding/Revisión/Recetas y pasarlas de forma segura y compacta a las Edge Functions de IA.

**Architecture:** Columnas `dietary_restrictions text[]` y `custom_allergies text[]` en `public.profiles` con constraints + trigger de normalización/validación y soporte retrocompatible en `complete_onboarding`. El cliente sincroniza mediante `dietaryPreferencesService.ts` + `useDietaryPreferences.ts` y reutiliza `<DietaryPreferencesSection />`; el backend comparte `supabase/functions/_shared/dietaryPreferences.ts` preservando el contrato de 1 llamada `rpc` (`reserve_ai_request`) por petición y la referencia exacta `CHILEAN_MEAL_VISION_PROMPT` en Groq.

**Tech Stack:** PostgreSQL (Supabase Migrations + RLS), TypeScript 5.3, React Native / Expo Router v4, TanStack Query v5, Zustand v5, Zod v3, Deno 2 Edge Functions, Jest.

## Global Constraints
- Mantener compatibilidad retroactiva con llamadas existentes a `complete_onboarding`, `detectDietaryAlerts`, `evaluateFoodAlerts` e `isRecipeCompatible`.
- No añadir ninguna llamada `rpc` extra en `analyze-meal`, `parse-meal-text`, `nutrition-coach` ni `coach-live-session`.
- Mantener la referencia exacta `prompt === CHILEAN_MEAL_VISION_PROMPT` en `GroqVisionProvider` para no superar el límite de 1.000 tokens de prompt en Groq.
- Conservar todos los comentarios/docstrings existentes no relacionados con los cambios y cumplir `type-check`, `lint`, `jest`, `deno check` y `build:pwa`.

---

### Task 1: Migración SQL y Tipos de Perfil/Base de Datos

**Files:**
- Create: `supabase/migrations/20261112000000_dietary_preferences_sync.sql`
- Modify: `src/types/database.types.ts`
- Modify: `src/types/profile.ts`
- Test: `src/types/__tests__/profileDietary.test.ts`

**Interfaces:**
- Produces in `src/types/profile.ts`:
  - `CUSTOM_ALLERGY_MAX_ITEMS = 15`, `CUSTOM_ALLERGY_MAX_LENGTH = 60`
  - `DietaryPreferences` (`{ restrictions: DietaryRestriction[]; customAllergies: string[] }`)
  - `normalizeDietaryRestrictions(values: unknown): DietaryRestriction[]`
  - `normalizeCustomAllergies(values: unknown): string[]`

- [ ] **Step 1: Escribir prueba unitaria para normalización de restricciones y alergias** en `src/types/__tests__/profileDietary.test.ts`.
- [ ] **Step 2: Ejecutar `npx jest src/types/__tests__/profileDietary.test.ts`** para verificar el fallo inicial.
- [ ] **Step 3: Crear la migración SQL `supabase/migrations/20261112000000_dietary_preferences_sync.sql`** con columnas en `profiles`, `CHECK` constraints, trigger `validate_profile_dietary_preferences()` y actualización de `complete_onboarding`.
- [ ] **Step 4: Actualizar `src/types/database.types.ts` y `src/types/profile.ts`**.
- [ ] **Step 5: Ejecutar `npx jest src/types/__tests__/profileDietary.test.ts` y `npm run type-check`** para verificar que pasan.

---

### Task 2: Motor de Alertas (`foodAlerts.ts`) con Alergias Personalizadas

**Files:**
- Modify: `src/utils/foodAlerts.ts`
- Modify: `src/utils/__tests__/foodAlerts.test.ts`

**Interfaces:**
- Consumes: `DietaryRestriction` from `src/types/profile.ts`
- Produces:
  - `FoodDietaryAlert` con `type: DietaryRestriction | "custom_allergy"`
  - `detectDietaryAlerts(foodName, nutrients, userRestrictions?, customAllergies?)`
  - `evaluateFoodAlerts(item, userRestrictions?, customAllergies?)`
  - `isRecipeCompatible(recipe, userRestrictions?, customAllergies?)`

- [ ] **Step 1: Añadir tests en `src/utils/__tests__/foodAlerts.test.ts`** cubriendo alergias personalizadas con tildes, plurales (`huevo` vs `huevos revueltos`, `champiñon` vs `champiñones`), exenciones `"sin huevo"` / `"libre de soya"` e `isRecipeCompatible` con `customAllergies`.
- [ ] **Step 2: Ejecutar `npx jest src/utils/__tests__/foodAlerts.test.ts`** y confirmar fallo de los casos nuevos.
- [ ] **Step 3: Implementar `matchesCustomAllergy` y extender `detectDietaryAlerts`, `evaluateFoodAlerts` e `isRecipeCompatible`** en `src/utils/foodAlerts.ts`.
- [ ] **Step 4: Ejecutar `npx jest src/utils/__tests__/foodAlerts.test.ts`** y verificar que todos pasan.

---

### Task 3: Servicio y Hook de Sincronización (`dietaryPreferencesService.ts` y `useDietaryPreferences.ts`)

**Files:**
- Modify: `src/services/dietaryPreferencesService.ts`
- Modify: `src/hooks/useDietaryPreferences.ts`
- Create: `src/services/__tests__/dietaryPreferencesService.test.ts`

**Interfaces:**
- Consumes: `DietaryPreferences`, `normalizeDietaryRestrictions`, `normalizeCustomAllergies` from `src/types/profile.ts`
- Produces:
  - `getDietaryPreferencesSnapshot(userId?)`
  - `saveDietaryPreferencesSnapshot(prefs, userId?)`
  - Compatibilidad: `getDietaryPreferences(userId?)`, `saveDietaryPreferences(restrictions, userId?)`
  - Hook `useDietaryPreferences()` con `{ restrictions, customAllergies, isLoading, isSaving, toggleRestriction, hasRestriction, addCustomAllergy, removeCustomAllergy, saveAllPreferences }`

- [ ] **Step 1: Crear `src/services/__tests__/dietaryPreferencesService.test.ts`** probando carga desde Supabase `profiles`, guardado sincronizado, migración única de caché legado y fallback offline.
- [ ] **Step 2: Ejecutar `npx jest src/services/__tests__/dietaryPreferencesService.test.ts`** y confirmar fallo inicial.
- [ ] **Step 3: Implementar `dietaryPreferencesService.ts` y actualizar `useDietaryPreferences.ts`**.
- [ ] **Step 4: Ejecutar `npx jest src/services/__tests__/dietaryPreferencesService.test.ts`** y verificar que pasa.

---

### Task 4: Componente Compartido y Pantallas (Ajustes, Onboarding, Revisión, Código de Barras y Recetas)

**Files:**
- Create: `src/components/common/DietaryPreferencesSection.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Modify: `app/(onboarding)/profile-setup.tsx`
- Modify: `app/(onboarding)/goals-review.tsx`
- Modify: `app/meal/review.tsx`
- Modify: `src/components/meal/MealReviewItemCard.tsx`
- Modify: `app/meal/barcode.tsx`
- Modify: `src/components/meal/barcode/ScannedProductSheet.tsx`
- Modify: `app/recipes/index.tsx`
- Modify: `app/recipes/[id].tsx`

- [ ] **Step 1: Crear `src/components/common/DietaryPreferencesSection.tsx`** con los 8 chips predefinidos y gestión de alergias personalizadas en texto libre.
- [ ] **Step 2: Integrar `DietaryPreferencesSection` en `app/(tabs)/settings.tsx` y como bloque opcional en `app/(onboarding)/profile-setup.tsx` + persistencia en `app/(onboarding)/goals-review.tsx`**.
- [ ] **Step 3: Propagar `customAllergies` en `review.tsx`, `MealReviewItemCard.tsx`, `barcode.tsx`, `ScannedProductSheet.tsx`, `recipes/index.tsx` y `recipes/[id].tsx`, añadiendo el banner de advertencia consolidado en `review.tsx`**.
- [ ] **Step 4: Ejecutar `npm run type-check`, `npm run lint` y `npm test -- --runInBand`**.

---

### Task 5: Edge Functions Conscientes de Restricciones y Verificación Integral

**Files:**
- Create: `supabase/functions/_shared/dietaryPreferences.ts`
- Modify: `supabase/functions/_shared/coachContext.ts`
- Modify: `supabase/functions/_shared/coachPrompt.ts`
- Modify: `supabase/functions/analyze-meal/providers/provider.interface.ts`
- Modify: `supabase/functions/analyze-meal/providers/gemini.ts`
- Modify: `supabase/functions/analyze-meal/providers/groq.ts`
- Modify: `supabase/functions/analyze-meal/index.ts`
- Modify: `supabase/functions/parse-meal-text/index.ts`
- Modify: `supabase/functions/__tests__/providerHandlers.test.js`
- Modify: `supabase/functions/__tests__/handlers.test.js`

- [ ] **Step 1: Agregar tests contractuales en `providerHandlers.test.js` y `handlers.test.js`** verificando inyección condicional de `dietaryPreferences` en el Coach, lectura best-effort en visión/texto sin llamadas `rpc` extra y preservación de `GROQ_MEAL_VISION_PROMPT`.
- [ ] **Step 2: Implementar `supabase/functions/_shared/dietaryPreferences.ts` y conectar `coachContext.ts`, `coachPrompt.ts`, `analyze-meal` y `parse-meal-text`**.
- [ ] **Step 3: Ejecutar verificación integral (`npm run type-check`, `npm run lint`, `npm test -- --runInBand`, `npx deno check`, `npm run build:pwa`) y confirmar todo en verde**.
