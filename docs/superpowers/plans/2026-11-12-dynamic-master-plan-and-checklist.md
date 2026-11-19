# Dynamic Master Plan & Persistent Daily Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable every authenticated user to create, customize, or AI-generate their own Master Plan with configurable training/load weekdays (`matchDay.weekdays`), keep Home/Coach goals synchronized automatically, and persist daily checklist adherence in Supabase across Home and `MasterPlanModal`.

**Architecture:** Extend `public.personal_plans` for authenticated self-management via `save_personal_plan` (optionally calling `set_nutrition_goals`), add `public.plan_daily_checklists` keyed by `(user_id, plan_date)`, share a dependency-free pure helper module (`src/utils/personalPlan.ts`) across client and Deno Edge Functions, expose `supabase/functions/generate-personal-plan` following existing AI quota/consent patterns, and decouple the UI into `MasterPlanCard` (Home), `MasterPlanModal` (detail + 7-day adherence + inline checklist editor), and `MasterPlanBuilderModal` (AI wizard + manual/template editor).

**Tech Stack:** Expo / React Native 52, TypeScript strict, React Query (`@tanstack/react-query`), Zod 3.24, Supabase PostgreSQL + RLS + Deno Edge Functions, Jest, ESLint.

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-11-12-dynamic-master-plan-and-checklist-design.md`.
- Preserve 100% backwards compatibility with existing `personal_plans` seeded rows (omitted `matchDay.weekdays` defaults to `[0]`; optional anthropometric fields may be absent on newly generated plans).
- Safe macro bounds compatible with `public.goals`: `calories 800..8000`, `proteinG 10..400`, `carbsG 10..1600`, `fatG 5..300`.
- Strict RLS `(SELECT auth.uid()) = user_id` on `personal_plans` and `plan_daily_checklists`, with explicit `REVOKE ALL` / `GRANT` and `SET search_path = ''` on RPCs.
- AI consent (`useAiConsent` / `AiConsentModal`) and `reserveAiRequest` must gate `generate-personal-plan`; `router.push("/legal" as Href)` for privacy navigation.
- Calendar dates and weekdays must use `America/Santiago` (`src/utils/dates.ts`), and `src/utils/personalPlan.ts` must avoid `@/` path aliases or React imports so Deno Edge Functions import it directly.
- Windows PowerShell chaining uses `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };`.

---

### Task 1: SQL Migration, Database Types & Pure Shared Plan/Checklist Helpers

**Files:**
- Create: `supabase/migrations/20261112020000_dynamic_master_plan_and_checklist.sql`
- Modify: `src/types/database.types.ts`
- Modify: `src/data/masterPlan.ts`
- Create: `src/utils/personalPlan.ts`
- Test: `src/utils/__tests__/personalPlan.test.ts`

**Interfaces:**
- Produces:
  - SQL table `public.plan_daily_checklists` + policies/grants on `public.personal_plans` + RPC `public.save_personal_plan(p_plan jsonb, p_sync_goals boolean)`
  - `MasterPlanData`, `MasterPlanSchema`, `ChecklistRecord`, `DayPlanResolution` from `src/data/masterPlan.ts` & `src/utils/personalPlan.ts`
  - Pure exports in `src/utils/personalPlan.ts`: `WEEKDAY_OPTIONS`, `getMatchDayWeekdays`, `resolveDayPlanTargets`, `normalizeHabitKey`, `isHabitChecked`, `toggleCheckedHabit`, `computeChecklistAdherence`, `sanitizeMasterPlanNumbers`

- [ ] **Step 1: Write failing tests in `src/utils/__tests__/personalPlan.test.ts`**

Test `getMatchDayWeekdays` (custom weekdays `[2, 4]`, disabled `[]`, legacy `undefined` -> `[0]`), `resolveDayPlanTargets` (matches `standard` within ±5 kcal tolerance and switches on configured weekdays; does not switch if user manually customized `goals` away from `standard`), `toggleCheckedHabit` (normalizes whitespace/case so reordered items remain consistent and bounds `completedCount`), and `computeChecklistAdherence` (today pct, 7-day average pct, consecutive `>= 80%` streak).

- [ ] **Step 2: Run Jest to verify failure**

Command: `npx jest src/utils/__tests__/personalPlan.test.ts` (expected FAIL — module missing).

- [ ] **Step 3: Create SQL migration, update `src/types/database.types.ts` & `src/data/masterPlan.ts`, implement `src/utils/personalPlan.ts`**

  - In `supabase/migrations/20261112020000_dynamic_master_plan_and_checklist.sql`:
    - Add `INSERT`, `UPDATE`, `DELETE` RLS policies with `(SELECT auth.uid()) = user_id` on `public.personal_plans`, optimize `"Read own personal plan"`, grant `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, add `BEFORE UPDATE` trigger `touch_updated_at()`.
    - Define `public.save_personal_plan(p_plan jsonb, p_sync_goals boolean DEFAULT true)` validating `standard` and optional `matchDay` bounds (`calories 800..8000`, `proteinG 10..400`, `carbsG 10..1600`, `fatG 5..300`), upserting into `personal_plans`, and calling `PERFORM public.set_nutrition_goals(...)` when `p_sync_goals`.
    - Create `public.plan_daily_checklists` with `UNIQUE (user_id, plan_date)`, index `(user_id, plan_date DESC)`, `touch_updated_at()` trigger, strict RLS, and `GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated`.
  - Update `src/types/database.types.ts` adding `plan_daily_checklists` and `Functions.save_personal_plan`.
  - Update `src/data/masterPlan.ts` making `bodyFatPct`, `skeletalMuscleKg`, `targetFatPct`, `bmrKcal`, `weeklyPaceKg`, `email` optional/nullable and adding `weekdays?: number[]` to `matchDay`, exporting `MasterPlanSchema` (Zod).
  - Implement `src/utils/personalPlan.ts` with pure TypeScript helpers (zero `@/` or RN imports).

- [ ] **Step 4: Run tests and type-check**

Command: `npx jest src/utils/__tests__/personalPlan.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run type-check` -> PASS.

---

### Task 2: Edge Function `generate-personal-plan`, `coachContext` Sync & CI

**Files:**
- Create: `supabase/functions/generate-personal-plan/types.ts`
- Create: `supabase/functions/generate-personal-plan/prompts/planPrompt.ts`
- Create: `supabase/functions/generate-personal-plan/index.ts`
- Modify: `supabase/functions/_shared/coachContext.ts`
- Modify: `.github/workflows/ci.yml`
- Test: `supabase/functions/__tests__/generatePersonalPlanHandler.test.js`

**Interfaces:**
- Consumes: `resolveDayPlanTargets`, `normalizeHabitKey` from `../../../src/utils/personalPlan.ts`; `_shared/http.ts`, `_shared/aiRouting.ts`, `_shared/gemini.ts`, `_shared/dietaryPreferences.ts`, `_shared/nutritionMath.ts`.
- Produces: HTTP Edge Function `generate-personal-plan` returning `{ success: true, plan, provider, model }`, plus `coachContext.ts` loading `todayChecklist` and dynamic `matchDay.weekdays`.

- [ ] **Step 1: Write failing tests in `supabase/functions/__tests__/generatePersonalPlanHandler.test.js`**

Mock `@supabase/supabase-js`, `crypto.subtle.digest` via `node:crypto`, and `fetch` for Gemini response. Cover:
  1. Unauthorized / missing profile rejects properly.
  2. Valid request reserves AI quota (`reserve_ai_request`), loads profile + dietary preferences, clamps out-of-range calories/macros safely, forces exact `matchDayWeekdays`, and preserves user profile stats (`heightCm`, `currentWeightKg`).
  3. Invalid AI JSON payload returns `502 AI_INVALID_RESPONSE`.

- [ ] **Step 2: Run Jest to verify failure**

Command: `npx jest supabase/functions/__tests__/generatePersonalPlanHandler.test.js` -> FAIL.

- [ ] **Step 3: Implement `generate-personal-plan` (`types.ts`, `prompts/planPrompt.ts`, `index.ts`), update `coachContext.ts` and `.github/workflows/ci.yml`**

  - `types.ts`: `GeneratePersonalPlanRequestSchema` + `AIPersonalPlanOutputSchema`.
  - `prompts/planPrompt.ts`: Chilean Spanish prompt for practical daily meal schedules, gym/sport routines (`setsReps`, `rir`, `rest`), optional supplements, and concrete habits (`dailyChecklist`), strictly observing `strictDietaryExclusion`.
  - `index.ts`: `authenticate`, Zod request parsing, `reserveAiRequest`, parallel fetch of `profiles` + active `goals` + `loadUserDietaryPreferencesBestEffort`, `generateText`, deterministic post-AI clamping/normalization, returning `{ success: true, plan, provider, model }`.
  - `coachContext.ts`: replace Sunday hardcode with `resolveDayPlanTargets(plan, getWeekday(now), ...)`, add best-effort query to `plan_daily_checklists` for `dateKey` when `scope === "full"`, attach `todayChecklist: { completedCount, totalCount }` to `compactPlan`.
  - `.github/workflows/ci.yml`: add `supabase/functions/generate-personal-plan/index.ts` to Deno check step.

- [ ] **Step 4: Run Jest & Deno check**

Command: `npx jest supabase/functions/__tests__/generatePersonalPlanHandler.test.js; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npx deno check --config supabase/functions/deno.json supabase/functions/generate-personal-plan/index.ts supabase/functions/nutrition-coach/index.ts` -> PASS.

---

### Task 3: Client Template, Services, Optimistic Hooks & `useDailyNutrition` Sync

**Files:**
- Create: `src/services/personalPlanTemplate.ts`
- Create: `src/services/personalPlanService.ts`
- Modify: `src/hooks/usePersonalPlan.ts`
- Modify: `src/hooks/useDailyNutrition.ts`
- Test: `src/services/__tests__/personalPlanService.test.ts`

**Interfaces:**
- Consumes: `MasterPlanData`, `MasterPlanSchema` (`src/data/masterPlan.ts`), `resolveDayPlanTargets`, `toggleCheckedHabit`, `computeChecklistAdherence` (`src/utils/personalPlan.ts`), `calculateNutritionGoals` (`src/utils/nutritionCalculator.ts`).
- Produces:
  - `buildLocalMasterPlanTemplate(input)` in `src/services/personalPlanTemplate.ts`
  - `getPersonalPlan`, `savePersonalPlan`, `deletePersonalPlan`, `generatePersonalPlanWithAi`, `getChecklistHistory`, `upsertDailyChecklist` in `src/services/personalPlanService.ts`
  - Hooks: `usePersonalPlan`, `useSavePersonalPlan`, `useDeletePersonalPlan`, `useGeneratePersonalPlan`, `useChecklistHistory`, `useToggleChecklistItem`

- [ ] **Step 1: Write failing tests in `src/services/__tests__/personalPlanService.test.ts`**

Cover `savePersonalPlan` RPC invocation (`p_plan`, `p_sync_goals`), `generatePersonalPlanWithAi` session/invoke/error extraction, `upsertDailyChecklist` normalization and `completed_count` bounds, and `buildLocalMasterPlanTemplate` valid `MasterPlanSchema` output for `lose_weight`, `maintain`, and `gain_muscle`.

- [ ] **Step 2: Run Jest to verify failure**

Command: `npx jest src/services/__tests__/personalPlanService.test.ts` -> FAIL.

- [ ] **Step 3: Implement `personalPlanTemplate.ts`, `personalPlanService.ts`, update `usePersonalPlan.ts` & `useDailyNutrition.ts`**

  - `personalPlanService.ts`: clean wrappers over Supabase queries, `save_personal_plan` RPC, `generate-personal-plan` function invoke with `extractFunctionErrorMessage`, and `plan_daily_checklists` CRUD.
  - `usePersonalPlan.ts`: React Query hooks with optimistic `useToggleChecklistItem` cache updates (instant UI toggle + rollback on mutation error) and coordinated invalidation of `["personalPlan"]` and `["dailyNutrition"]`.
  - `useDailyNutrition.ts`: use `resolveDayPlanTargets(personalPlan, getWeekday(selectedDate), { calories: goalData.calories, proteinG: goalData.protein_g, carbsG: goalData.carbs_g, fatG: goalData.fat_g })` instead of hardcoded Sunday check.

- [ ] **Step 4: Run Jest & type-check**

Command: `npx jest src/services/__tests__/personalPlanService.test.ts src/utils/__tests__/personalPlan.test.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run type-check` -> PASS.

---

### Task 4: UI Components (`MasterPlanCard`, `MasterPlanBuilderModal`, `MasterPlanModal`) & Home Integration

**Files:**
- Create: `src/components/dashboard/MasterPlanCard.tsx`
- Create: `src/components/dashboard/MasterPlanBuilderModal.tsx`
- Modify: `src/components/dashboard/MasterPlanModal.tsx`
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- `MasterPlanCard`: `{ plan: MasterPlanData | null; selectedDate: Date; onOpenPlan: () => void; onOpenBuilder: () => void }`
- `MasterPlanBuilderModal`: `{ visible: boolean; existingPlan: MasterPlanData | null; onClose: () => void; onSaved?: (plan: MasterPlanData) => void }`
- `MasterPlanModal`: `{ visible: boolean; selectedDate?: Date; onClose: () => void; onOpenBuilder?: () => void }`

- [ ] **Step 1: Build `src/components/dashboard/MasterPlanCard.tsx`**

Always visible on Home:
- If `!plan`: invites user to create their Plan Maestro (`"Crear mi Plan Maestro"` CTA opening `onOpenBuilder`).
- If `plan`: displays objective title, active day badge (`"Día de carga"` vs `"Día estándar"` via `resolveDayPlanTargets`), today's checklist progress bar + 7-day adherence badge, up to 3 quick-toggle habit rows wired to `useToggleChecklistItem`, and `"Ver plan"` button.

- [ ] **Step 2: Build `src/components/dashboard/MasterPlanBuilderModal.tsx`**

Two clean modes (`IA` and `Manual / Plantilla`):
- IA mode: configurable `matchDayWeekdays` (`L M X J V S D`), `trainingDaysPerWeek`, `trainingFocus`, `equipment`, `mealsPerDay`, `targetWeightKg`, `customNotes`; checks `useAiConsent` and displays `AiConsentModal` (`router.push("/legal" as Href)`) before invoking `useGeneratePersonalPlan`.
- Manual / Template mode: initializes from `existingPlan` or `buildLocalMasterPlanTemplate(profile)`, lets user edit objective title, `standard` and `matchDay` calories/macros, `matchDayWeekdays`, supplements, and `dailyChecklist` items.
- Preview/Confirmation footer: toggle `"Sincronizar metas del Home"` (default `true`) + `"Guardar Plan Maestro"` button calling `useSavePersonalPlan`.

- [ ] **Step 3: Upgrade `src/components/dashboard/MasterPlanModal.tsx` & wire into `app/(tabs)/index.tsx`**

- `MasterPlanModal`:
  - Header button `"Editar / Regenerar"` triggering `onOpenBuilder`.
  - Resilient anthropometric header (shows InBody `% grasa`/`MME` when present; omits unavailable fields cleanly for non-InBody users).
  - Nutrición tab displays active `matchDay` weekdays (`L M X J V S D`) and highlights today's mode (`selectedDate`).
  - Hábitos & Supl. tab renders 7-day adherence strip (`useChecklistHistory(7)`), persisted `useToggleChecklistItem(dateKey)` rows, and inline habit add/remove editor saving directly to `personal_plans` (`syncGoals: false`).
- `app/(tabs)/index.tsx`:
  - Replace `{personalPlan && (...)}` banner with `<MasterPlanCard ... />`.
  - Pass `selectedDate` and `onOpenBuilder` to `MasterPlanModal`, and lazy-load `MasterPlanBuilderModal`.

- [ ] **Step 4: Run `type-check` & `lint`**

Command: `npm run type-check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run lint` -> PASS.

---

### Task 5: Full End-to-End Verification

**Files:** Verify all touched files cleanly.

- [ ] **Step 1: Run TypeScript check, ESLint, and all Deno Edge Function checks**

Command: `npm run type-check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run lint; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npx deno check --config supabase/functions/deno.json supabase/functions/analyze-meal/index.ts supabase/functions/coach-live-session/index.ts supabase/functions/generate-personal-plan/index.ts supabase/functions/generate-recipe/index.ts supabase/functions/nutrition-coach/index.ts supabase/functions/parse-meal-text/index.ts supabase/functions/search-foods/index.ts`

- [ ] **Step 2: Run full Jest suite**

Command: `npm test -- --runInBand`

- [ ] **Step 3: Run full PWA Web Export build**

Command: `npm run build:pwa`
