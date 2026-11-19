# Especificación de Diseño: Sub-proyecto 3 — Plan Maestro Dinámico y Checklist Diario Persistente

**Fecha:** 2026-11-12  
**Estado:** Aprobado para Planificación e Implementación  
**Autor:** Antigravity & Usuario  

---

## 1. Resumen y Contexto

Hasta ahora, el módulo de **Plan Maestro** ([`MasterPlanModal.tsx`](../../../src/components/dashboard/MasterPlanModal.tsx) y [`usePersonalPlan.ts`](../../../src/hooks/usePersonalPlan.ts)) presenta tres limitaciones estructurales:
1. La tabla `public.personal_plans` solo otorga `SELECT` al rol `authenticated`, impidiendo que un usuario normal cree, regenere o edite su propio plan desde la app; además [`app/(tabs)/index.tsx`](../../../app/(tabs)/index.tsx) oculta por completo el acceso al Plan Maestro cuando `personalPlan` es `null`.
2. El ciclado calórico (`matchDay`) está fijado de forma rígida únicamente para los domingos (`getWeekday === 0`) tanto en [`useDailyNutrition.ts`](../../../src/hooks/useDailyNutrition.ts) como en [`coachContext.ts`](../../../supabase/functions/_shared/coachContext.ts).
3. El **Checklist Diario de Cumplimiento** vive en un `useState` efímero dentro de `MasterPlanModal`, por lo que se pierde al cerrar el modal o recargar la app y no registra adherencia histórica ni se refleja en el Home ni en el contexto del Coach.

Este sub-proyecto transforma el Plan Maestro en una herramienta autogestionable, persistente y sincronizada para cualquier usuario:
1. **Autogestión completa del Plan Maestro** con dos caminos sin fricción: generación personalizada con IA (`supabase/functions/generate-personal-plan`) o plantilla rápida determinista + editor manual antes/después de guardar.
2. **Ciclado calórico configurable por días de la semana (`matchDay.weekdays`)** con sincronización atómica hacia `public.goals` (vía `save_personal_plan` -> `set_nutrition_goals`) y resolución compartida en Home y Coach.
3. **Checklist Diario Persistente (`public.plan_daily_checklists`)** por fecha calendario (`America/Santiago`), con acciones optimistas en Home y Modal, edición de hábitos propios e historial visual de adherencia de los últimos 7 días.

---

## 2. Objetivos y No Objetivos

### Objetivos
- Habilitar RLS y RPC atómica `public.save_personal_plan(p_plan jsonb, p_sync_goals boolean)` para que cada usuario autenticado cree, actualice o elimine su propio registro en `public.personal_plans`, sincronizando opcionalmente `public.goals`.
- Crear `public.plan_daily_checklists` (`UNIQUE (user_id, plan_date)`) con RLS `(SELECT auth.uid()) = user_id` para persistir los hábitos marcados cada día y conservar el cálculo histórico (`completed_count / total_items`) aunque el plan cambie después.
- Extender [`MasterPlanData`](../../../src/data/masterPlan.ts) de forma 100% retrocompatible con planes sembrados existentes: `dailyGoals.matchDay.weekdays?: number[]` (fallback `[0]` si se omite en planes legados) y campos antropométricos avanzados opcionales/anulables para usuarios sin medición InBody.
- Implementar Edge Function `supabase/functions/generate-personal-plan/index.ts` usando `generateText` (Gemini ↔ Groq), `reserveAiRequest`, `loadUserDietaryPreferencesBestEffort` y validación Zod + saneado de rangos nutricionales.
- Exponer una tarjeta permanente [`MasterPlanCard`](../../../src/components/dashboard/MasterPlanCard.tsx) en Home (con CTA si no hay plan, o estado del día Estándar/Carga + barra de progreso + hasta 3 checks rápidos si ya existe), ampliar [`MasterPlanModal`](../../../src/components/dashboard/MasterPlanModal.tsx) (adherencia 7 días, edición inline de hábitos) y separar [`MasterPlanBuilderModal`](../../../src/components/dashboard/MasterPlanBuilderModal.tsx) (asistente IA con `useAiConsent`/`AiConsentModal` + modo plantilla/manual).
- Inyectar el estado del checklist del día actual (`todayChecklist`) y resolución dinámica de `matchDay.weekdays` dentro de `coachContext.ts`.

### No Objetivos
- Recalibración automática semanal de calorías mediante regresión de `weight_logs` (se mantiene creación, regeneración bajo demanda y edición manual; la recalibración adaptativa queda fuera de este alcance).
- Checkboxes independientes por cada comida del horario o cronómetro de descansos en vivo dentro de la rutina de gimnasio.
- Eliminación o refactorización del sistema existente de metas manuales en `Settings` o `Goals`.

---

## 3. Modelo de Datos y Migración SQL

**Archivo nuevo:** `supabase/migrations/20261112020000_dynamic_master_plan_and_checklist.sql`

### 3.1. Autogestión de `public.personal_plans` y RPC `public.save_personal_plan`
- RLS en `public.personal_plans`: mantener `"Read own personal plan"` optimizada y añadir políticas propias para `INSERT`, `UPDATE` y `DELETE` con `(SELECT auth.uid()) = user_id` + `GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_plans TO authenticated`.
- Trigger `touch_updated_at()` en `BEFORE UPDATE` sobre `public.personal_plans` (reutilizando la función existente `public.touch_updated_at()`).
- RPC `public.save_personal_plan(p_plan jsonb, p_sync_goals boolean DEFAULT true) RETURNS public.personal_plans` (`LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''`):
  - Exige `auth.uid() IS NOT NULL` (`ERRCODE = '42501'`).
  - Valida `jsonb_typeof(p_plan) = 'object'`, presencia de `p_plan->'dailyGoals'->'standard'` y `p_plan->'user'->>'objectiveTitle'`.
  - Extrae enteros de `standard` (`calories`, `proteinG`, `carbsG`, `fatG`) validando explícitamente restricciones compatibles con `public.goals`: `calories BETWEEN 800 AND 8000`, `proteinG BETWEEN 10 AND 400`, `carbsG BETWEEN 10 AND 1600`, `fatG BETWEEN 5 AND 300` (`ERRCODE = '22023'` si falla).
  - Valida si existe `matchDay` que sus valores también estén dentro de esos límites seguros.
  - Ejecuta `INSERT INTO public.personal_plans (user_id, plan, updated_at) VALUES (caller_id, p_plan, now()) ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, updated_at = now() RETURNING * INTO saved`.
  - Si `p_sync_goals` es `true`, llama `PERFORM public.set_nutrition_goals(cal, prot, carbs, fat)` en la misma transacción.
- `REVOKE ALL` / `GRANT EXECUTE ON FUNCTION public.save_personal_plan(jsonb, boolean) TO authenticated`.

### 3.2. Tabla `public.plan_daily_checklists`
- Columnas:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
  - `plan_date date NOT NULL`
  - `checked_items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(checked_items) = 'array')`
  - `total_items integer NOT NULL DEFAULT 0 CHECK (total_items BETWEEN 0 AND 50)`
  - `completed_count integer NOT NULL DEFAULT 0 CHECK (completed_count BETWEEN 0 AND total_items)`
  - `updated_at timestamptz NOT NULL DEFAULT now()`
- Restricciones e índices:
  - `UNIQUE (user_id, plan_date)`
  - `CREATE INDEX IF NOT EXISTS idx_plan_daily_checklists_user_date ON public.plan_daily_checklists (user_id, plan_date DESC)`
- Trigger: `touch_updated_at()` en `BEFORE UPDATE`.
- RLS y permisos:
  - `ALTER TABLE public.plan_daily_checklists ENABLE ROW LEVEL SECURITY`
  - Políticas `SELECT`, `INSERT`, `UPDATE`, `DELETE` con `(SELECT auth.uid()) = user_id`.
  - `REVOKE ALL ON public.plan_daily_checklists FROM PUBLIC, anon, authenticated;`
  - `GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_daily_checklists TO authenticated;`
  - `GRANT ALL ON public.plan_daily_checklists TO service_role;`

### 3.3. Regla de coincidencia de hábitos
- Cada hábito del plan se almacena en `dailyChecklist: string[]`.
- En `plan_daily_checklists.checked_items`, los ítems marcados se almacenan por su texto normalizado/exacto (`trim()`). Para evitar desfases si el usuario edita o reordena `dailyChecklist` semanas después, un hábito actual se considera marcado si su versión `trim().toLowerCase()` está presente en `checked_items`, mientras que el historial previo conserva `completed_count` y `total_items` exactos de ese día.

---

## 4. Contrato Compartido y Utilidades Puras

### 4.1. Extensión retrocompatible de `MasterPlanData` ([`src/data/masterPlan.ts`](../../../src/data/masterPlan.ts))
- `user`: mantiene `fullName`, `heightCm`, `currentWeightKg`, `targetWeightKg`, `objectiveTitle`, `objectiveDesc`; vuelve opcionales `email`, `targetFatPct`, `bodyFatPct`, `skeletalMuscleKg`, `bmrKcal`, `weeklyPaceKg` para planes generados sin examen InBody.
- `dailyGoals.matchDay`: añade `weekdays?: number[]` (enteros `0..6` con `0 = Domingo`, `1 = Lunes`, ..., `6 = Sábado`).
- El esquema Zod de validación valida límites seguros (`calories 800..8000`, `weekdays` únicos `0..6`, arrays acotados).

### 4.2. Helper puro multi-runtime ([`src/utils/personalPlan.ts`](../../../src/utils/personalPlan.ts))
Escrito sin imports `@/` ni dependencias nativas/React para ser importado de forma segura por **Metro/Jest** y por **Deno Edge Functions**:
- `getMatchDayWeekdays(plan)`: retorna `plan.dailyGoals.matchDay.weekdays` si está definido (incluido `[]` cuando el usuario desactiva días de carga); si es `undefined` (planes legados), retorna `[0]`.
- `resolveDayPlanTargets(plan, weekday, baseGoal)`:
  - Evalúa si `weekday` pertenece a `getMatchDayWeekdays(plan)`.
  - Si corresponde y `baseGoal` coincide con `standard` (tolerancia de ±5 kcal / ±2 g en macros para absorber redondeos), retorna `{ isMatchDay: true, calories: matchDay.calories, proteinG: matchDay.proteinG, carbsG: matchDay.carbsG, fatG: matchDay.fatG }`. En caso contrario retorna `{ isMatchDay: false, ...baseGoal }`.
- `isHabitChecked(checkedItems, habit)` y `toggleCheckedHabit(checkedItems, currentChecklist, habit)`: devuelven la lista saneada de ítems marcados restringida al conjunto válido actual + `completedCount` acotado a `totalItems`.
- `computeChecklistAdherence(rows, dateKeys)`: calcula cumplimiento de hoy (`ratio`, `pct`), porcentaje promedio en los últimos `N` días configurados y racha consecutiva de días completados al `>= 80%`.

### 4.3. Generador determinista de respaldo ([`src/services/personalPlanTemplate.ts`](../../../src/services/personalPlanTemplate.ts))
- `buildLocalMasterPlanTemplate(input)`: utiliza `calculateNutritionGoals` de [`src/utils/nutritionCalculator.ts`](../../../src/utils/nutritionCalculator.ts) para producir un `MasterPlanData` completo cuando el usuario elige crear su plan manualmente sin IA o ajustarlo desde cero:
  - Días estándar calculados con `calculateNutritionGoals`.
  - Días de carga (`matchDay`) opcionales con incremento moderado en energía/carbohidratos (`+250 kcal`, proteínas mantenidas, +55g carbohidratos orientativos) si existen `matchDayWeekdays`.
  - Estructura inicial de horarios de comida, rutina base acorde a `trainingDaysPerWeek`, 2 suplementos orientativos opcionales (creatina / proteína o electrolitos) y checklist inicial de 5 hábitos accionables.

---

## 5. Edge Function `generate-personal-plan` y Contexto del Coach

**Carpeta nueva:** `supabase/functions/generate-personal-plan/`
- `types.ts`:
  - `GeneratePersonalPlanRequestSchema`:
    - `matchDayWeekdays`: `z.array(z.number().int().min(0).max(6)).max(7).default([])`
    - `trainingDaysPerWeek`: `z.number().int().min(0).max(7).default(4)`
    - `trainingFocus`: `z.string().trim().min(2).max(80).default("Fuerza y composición corporal")`
    - `equipment`: `z.enum(["gym", "home_dumbbells", "bodyweight"]).default("gym")`
    - `mealsPerDay`: `z.number().int().min(3).max(6).default(4)`
    - `targetWeightKg`: `z.number().min(30).max(300).optional()`
    - `includeSupplements`: `z.boolean().default(true)`
    - `customNotes`: `z.string().trim().max(240).optional()`
  - `AIPersonalPlanOutputSchema`: valida estrictamente la estructura de `MasterPlanData` devuelta por Gemini/Groq (`dailyGoals.standard`, `dailyGoals.matchDay`, `waterMl`, `mealSchedule` `3..7` bloques, `weeklyRoutine` `1..7` días, `supplements` `0..6`, `dailyChecklist` `3..10` ítems).
- `prompts/planPrompt.ts`:
  - Prompt en español de Chile orientado a adherencia realista con alimentos cotidianos locales, rutinas claras con `setsReps`/`rir`/`rest`, respeto estricto de `strictDietaryExclusion` y sin afirmaciones médicas.
- `index.ts`:
  - `authenticate(req)` -> valida JSON -> `reserveAiRequest(client, user.id)`.
  - Lee en paralelo `profiles` (peso, estatura, edad, sexo, `activity_level`, `objective`, `target_weight_kg`, `full_name`), `goals` activas y `loadUserDietaryPreferencesBestEffort(client, user.id)`.
  - Llama `generateText({ geminiKey, task: "text", json: true, maxTokens: 3200, temperature: 0.3, validate })`.
  - Aplica saneamiento determinista post-IA: fuerza rangos de calorías/macros dentro de `800..8000 kcal`, asigna exactamente `dailyGoals.matchDay.weekdays = input.matchDayWeekdays` y conserva datos del perfil (`heightCm`, `currentWeightKg`, `targetWeightKg`).
  - Retorna `{ plan, provider, model }`.
- Actualización de [`supabase/functions/_shared/coachContext.ts`](../../../supabase/functions/_shared/coachContext.ts):
  - Importa `resolveDayPlanTargets` desde `../../../src/utils/personalPlan.ts`.
  - Consulta en el `Promise.all` inicial (en modo `full`, best-effort con `.maybeSingle()`) `plan_daily_checklists` para `dateKey` de hoy.
  - Sustituye el `if (getWeekday(now) === 0 ...)` por `resolveDayPlanTargets(plan, getWeekday(now), { calories: target.calories, proteinG: target.protein_g, carbsG: target.carbs_g, fatG: target.fat_g })`.
  - Adjunta `todayChecklist` (completados vs total del plan actual) dentro de `compactPlan`.
- Actualización de [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml): agregar `supabase/functions/generate-personal-plan/index.ts` al comando `deno check`.

---

## 6. Capa de Servicios y Hooks Cliente

### 6.1. Servicio [`src/services/personalPlanService.ts`](../../../src/services/personalPlanService.ts)
- `getPersonalPlan(userId, signal?)`: lee `personal_plans`, valida con `MasterPlanSchema` y devuelve `MasterPlanData | null`.
- `savePersonalPlan(plan, options?: { syncGoals?: boolean })`: valida con `MasterPlanSchema` en cliente y ejecuta `supabase.rpc("save_personal_plan", { p_plan: plan, p_sync_goals: options?.syncGoals ?? true })`.
- `deletePersonalPlan(userId)`: elimina la fila propia del usuario en `personal_plans` sin borrar historial nutricional previo.
- `generatePersonalPlanWithAi(input)`: obtiene sesión (`requireAuthenticatedSession` / `invoke`), invoca `generate-personal-plan` con `extractFunctionErrorMessage` y valida el resultado.
- `getChecklistHistory(userId, startDateKey, endDateKey, signal?)`: lee `plan_daily_checklists` en el rango de fechas pedido ordenado ascendentemente.
- `upsertDailyChecklist(userId, planDate, checkedItems, totalItems)`: sanea y limita `completed_count` y hace `upsert(..., { onConflict: "user_id,plan_date" })`.

### 6.2. Hooks React Query [`src/hooks/usePersonalPlan.ts`](../../../src/hooks/usePersonalPlan.ts) y [`src/hooks/useDailyNutrition.ts`](../../../src/hooks/useDailyNutrition.ts)
- `usePersonalPlan()`: mantiene query key `["personalPlan", user?.id]`.
- `useSavePersonalPlan()`: mutación que invalida `["personalPlan"]` y `["dailyNutrition"]` y actualiza el caché inmediato.
- `useGeneratePersonalPlan()`: mutación hacia `generatePersonalPlanWithAi`.
- `useChecklistHistory(days = 7, referenceDate = new Date())`: carga últimos `N` días (incluido `selectedDate`) con query key `["personalPlanChecklist", user?.id, startKey, endKey]`.
- `useToggleChecklistItem(dateKey)`: ejecuta `onMutate` optimista sobre el caché de `["personalPlanChecklist"]` para respuesta instantánea en un toque y hace rollback automático + toast de error si falla `upsertDailyChecklist`.
- `useDailyNutrition(selectedDate)`: usa `resolveDayPlanTargets(personalPlan, getWeekday(selectedDate), ...)` y devuelve además `isMatchDay` (opcional/derivado o consumible por el Home).

---

## 7. Experiencia UI y Flujo de Usuario

### 7.1. Tarjeta en Home ([`src/components/dashboard/MasterPlanCard.tsx`](../../../src/components/dashboard/MasterPlanCard.tsx))
Integrada en [`app/(tabs)/index.tsx`](../../../app/(tabs)/index.tsx) para la fecha seleccionada (`selectedDate`):
- **Estado sin plan (`personalPlan === null`):** tarjeta limpia con explicación breve (`"Define metas por día, rutina y checklist diario"`) y botón `"Crear mi Plan Maestro"` que abre [`MasterPlanBuilderModal`](../../../src/components/dashboard/MasterPlanBuilderModal.tsx).
- **Estado con plan activo:**
  - Cabecera con título del objetivo (`personalPlan.user.objectiveTitle`), pill dinámica (`"Día estándar"` vs `"Día de carga ⚡"` según `resolveDayPlanTargets`) y botón `"Ver plan"`.
  - Barra de progreso del día (`X/Y hábitos completados · 7d: Z%`).
  - Lista rápida de hasta 3 hábitos pendientes/activos tocables directamente desde Home (checkbox persistente en `plan_daily_checklists`) y pie con enlace al resto cuando haya más de 3 ítems.

### 7.2. Modal de Plan Maestro ([`src/components/dashboard/MasterPlanModal.tsx`](../../../src/components/dashboard/MasterPlanModal.tsx))
Recibe `{ visible, selectedDate?, onClose, onOpenBuilder }`:
- **Cabecera:** botón `"Editar / Regenerar"` que abre `MasterPlanBuilderModal` precargado con el plan actual.
- **Tarjeta resumen superior:** si el plan incluye `bodyFatPct` o `skeletalMuscleKg` los muestra como antes; si provienen de perfil estándar sin InBody, muestra solo estatura, peso actual, peso objetivo y TMB/ritmo sin placeholders rotos.
- **Pestaña Nutrición:** muestra días configurados de carga (`L M X J V S D`) y resalta el modo activo para `selectedDate`.
- **Pestaña Hábitos & Supl.:**
  - Tira semanal de adherencia (últimos 7 días hasta hoy con indicador visual de cumplimiento).
  - Checklist persistido de `selectedDate` con checkboxes conectados a `useToggleChecklistItem`.
  - Micro-editor inline para **agregar nuevo hábito** o **eliminar un hábito** de `dailyChecklist`, guardando mediante `useSavePersonalPlan(..., { syncGoals: false })`.

### 7.3. Constructor / Editor ([`src/components/dashboard/MasterPlanBuilderModal.tsx`](../../../src/components/dashboard/MasterPlanBuilderModal.tsx))
Componente desacoplado con 2 flujos claros:
1. **Asistente IA:** selector de días de carga (`L M X J V S D`), frecuencia de entrenamiento (`0..7`), enfoque (`Fuerza`, `Fútbol/Deporte`, `Running/Cardio`, `Recomposición`), equipamiento (`Gimnasio`, `Mancuernas`, `Peso corporal`), comidas diarias (`3..6`) y notas breves. Antes de invocar `generate-personal-plan`, verifica `useAiConsent` mostrando [`AiConsentModal`](../../../src/components/common/AiConsentModal.tsx) si aún no fue aceptado.
2. **Plantilla rápida / Edición manual:** inicializa desde `plan` existente o con `buildLocalMasterPlanTemplate`, permitiendo ajustar calorías/macros estándar y de día de carga, días de carga, título del objetivo, suplementos e ítems del checklist.
3. **Vista previa y activación:** tras generar con IA o editar, permite revisar el resumen nutricional/días, activar/desactivar `"Sincronizar metas del Home"` (activo por defecto) y pulsar `"Guardar Plan Maestro"`.

---

## 8. Estrategia de Pruebas y Criterios de Aceptación

- **Tests puros (`src/utils/__tests__/personalPlan.test.ts`):** resolución de días de carga (`matchDayWeekdays` custom, `[]`, y legado `[0]`), tolerancia al comparar con `goals`, toggle/normalización de hábitos y cálculo de adherencia 7d + racha.
- **Tests de Edge Function (`supabase/functions/__tests__/generatePersonalPlanHandler.test.js`):** autorización JWT, reserva de cuota, saneado de rangos calóricos/macros y preservación de `matchDayWeekdays`, más validación Zod ante salida malformada de IA.
- **Tests de servicio (`src/services/__tests__/personalPlanService.test.ts`):** `savePersonalPlan` RPC, `generatePersonalPlanWithAi` manejo de errores, `upsertDailyChecklist` y `getChecklistHistory`.
- **Verificación de integración:** `npm run type-check`, `npm run lint`, `npx deno check` (incluyendo `supabase/functions/generate-personal-plan/index.ts`), `npm test -- --runInBand` y `npm run build:pwa` en código `0`.
