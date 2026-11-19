# Sub-proyecto 2: Generador de Recetas IA + Lista de Compras Inteligente — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el generador de recetas personalizadas con IA guardado por defecto en biblioteca privada (`user_recipes`) y la lista de compras inteligente única sincronizada en Supabase (`shopping_list_items`) con fusión atómica por ingrediente/unidad, clasificación por pasillo chileno y exportación para WhatsApp.

**Architecture:** Dos nuevas tablas privadas en Postgres (`public.user_recipes` y `public.shopping_list_items`) protegidas con RLS `(SELECT auth.uid()) = user_id` y RPC `public.upsert_shopping_list_items(p_items jsonb)` (`SECURITY INVOKER`). Una nueva Edge Function `supabase/functions/generate-recipe` genera 1 receta completa mediante `generateText` (Gemini ↔ Groq), reserva cuota única con `reserveAiRequest` e inyecta preferencias dietéticas del Sub-proyecto 1 mediante `loadUserDietaryPreferencesBestEffort`. En el cliente, `recipeService.ts`, `shoppingListService.ts` y `shoppingList.ts` alimentan `/recipes`, el modal generador, `/recipes/[id]` y `/recipes/shopping-list`.

**Tech Stack:** PostgreSQL (Supabase Migrations + RLS + PL/pgSQL RPC), TypeScript 5.3, React Native / Expo Router v4, TanStack Query v5, Zod v3, Deno 2 Edge Functions, Jest.

## Global Constraints
- Mantener una sola llamada RPC de cuota IA (`reserve_ai_request`) en `generate-recipe` sin llamadas RPC extra.
- Conservar compatibilidad total con el catálogo público `public.recipes` / `recipe_ingredients` y con `DetectedFoodItemSchema` (`unit: "g" | "ml"`) al enviar recetas hacia `/meal/review`.
- Exigir consentimiento previo de IA (`useAiConsent` / `AiConsentModal`) antes de invocar `generate-recipe`.
- Usar únicamente dependencias presentes en `package.json` (`navigator.clipboard` en web y `Share.share` nativo para compartir lista; sin `expo-clipboard`).
- Mantener intactos los comentarios y docstrings no relacionados y aprobar `type-check`, `lint`, `jest`, `deno check` y `build:pwa`.

---

### Task 1: Migración SQL, Tipos de Recetas/Compras y Motor `shoppingList.ts`

**Files:**
- Create: `supabase/migrations/20261112010000_ai_recipes_and_shopping_list.sql`
- Modify: `src/types/database.types.ts`
- Create: `src/types/recipe.ts`
- Create: `src/utils/shoppingList.ts`
- Test: `src/utils/__tests__/shoppingList.test.ts`

**Interfaces:**
- Produces in `src/types/recipe.ts`:
  - `ShoppingUnitSchema`, `ShoppingUnit` (`"g" | "ml" | "unidad"`)
  - `ShoppingCategorySchema`, `ShoppingCategory` (`"verduras_frutas" | "proteinas" | "lacteos_huevos" | "despensa_granos" | "condimentos_aceites" | "otros"`)
  - `SHOPPING_CATEGORY_LABELS`, `SHOPPING_CATEGORY_ORDER`
  - `RecipeSource` (`"catalog" | "ai"`)
  - `RecipeIngredient`, `Recipe`, `ShoppingListItem`, `UpsertShoppingItemInput`, `GenerateRecipeRequest`, `GenerateRecipeRequestSchema`
- Produces in `src/utils/shoppingList.ts`:
  - `normalizeShoppingIngredientKey(name: string): string`
  - `categorizeIngredientChile(foodName: string): ShoppingCategory`
  - `inferShoppingUnit(foodName: string, hintUnit?: string): ShoppingUnit`
  - `buildShoppingItemsFromRecipe(recipe: Recipe, targetServings?: number): UpsertShoppingItemInput[]`
  - `mergeShoppingListPreview(existing: ShoppingListItem[], incoming: UpsertShoppingItemInput[]): ShoppingListItem[]`
  - `formatShoppingListForShare(items: ShoppingListItem[]): string`

- [ ] **Step 1: Escribir prueba unitaria `src/utils/__tests__/shoppingList.test.ts`** cubriendo normalización de tildes/plurales, clasificación chilena, escalado por porciones (incluyendo `unit: "unidad"` vs `"g"`/`"ml"`), fusión de ítems `checked = false` vs `checked = true` y formato de texto WhatsApp.
- [ ] **Step 2: Ejecutar `npx jest src/utils/__tests__/shoppingList.test.ts`** para verificar que falla inicialmente por módulos inexistentes.
- [ ] **Step 3: Crear `supabase/migrations/20261112010000_ai_recipes_and_shopping_list.sql`** con `user_recipes`, `shopping_list_items`, triggers `touch_updated_at()`, índices, RLS `(SELECT auth.uid()) = user_id`, RPC `upsert_shopping_list_items(p_items jsonb)` y `NOTIFY pgrst, 'reload schema'`.
- [ ] **Step 4: Actualizar `src/types/database.types.ts`** añadiendo `user_recipes`, `shopping_list_items` y `Functions["upsert_shopping_list_items"]`.
- [ ] **Step 5: Crear `src/types/recipe.ts` y `src/utils/shoppingList.ts`**.
- [ ] **Step 6: Ejecutar `npx jest src/utils/__tests__/shoppingList.test.ts` y `npm run type-check`** y verificar que pasan.

---

### Task 2: Edge Function `generate-recipe` + Tests de Contrato + CI

**Files:**
- Create: `supabase/functions/generate-recipe/types.ts`
- Create: `supabase/functions/generate-recipe/prompts/recipePrompt.ts`
- Create: `supabase/functions/generate-recipe/index.ts`
- Test: `supabase/functions/__tests__/generateRecipeHandler.test.js`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `supabase/functions/_shared/http.ts`, `_shared/aiRouting.ts` (`generateText`, `optionalGeminiKey`), `_shared/gemini.ts` (`parseModelJson`), `_shared/dietaryPreferences.ts` (`loadUserDietaryPreferencesBestEffort`, `formatCompactDietaryNote`).
- Produces in `supabase/functions/generate-recipe/index.ts`: `handleRequest(req: Request): Promise<Response>` retornando `{ success: true, data: UserRecipeRow, meta: { model, latency_ms } }`.

- [ ] **Step 1: Escribir tests de contrato en `supabase/functions/__tests__/generateRecipeHandler.test.js`** validando rechazo 401/405/400, 1 sola llamada `reserve_ai_request`, inyección de restricciones/alergias desde `profiles`, recálculo exacto de calorías/macros por porción desde ingredientes, inserción en `user_recipes` y manejo limpio de fallo de proveedor (503).
- [ ] **Step 2: Ejecutar `npx jest supabase/functions/__tests__/generateRecipeHandler.test.js`** para confirmar fallo inicial.
- [ ] **Step 3: Crear `types.ts`, `prompts/recipePrompt.ts` e `index.ts`** en `supabase/functions/generate-recipe/`.
- [ ] **Step 4: Agregar `supabase/functions/generate-recipe/index.ts` al job `deno check` de `.github/workflows/ci.yml`**.
- [ ] **Step 5: Ejecutar `npx jest supabase/functions/__tests__/generateRecipeHandler.test.js` y `npx deno check --config supabase/functions/deno.json supabase/functions/generate-recipe/index.ts`**.

---

### Task 3: Servicios y Hooks Cliente (`recipeService`, `useRecipes`, `shoppingListService`, `useShoppingList`)

**Files:**
- Modify: `src/services/recipeService.ts`
- Modify: `src/hooks/useRecipes.ts`
- Create: `src/services/shoppingListService.ts`
- Create: `src/hooks/useShoppingList.ts`
- Test: `src/services/__tests__/recipeService.test.ts`
- Test: `src/services/__tests__/shoppingListService.test.ts`

**Interfaces:**
- Consumes: `src/types/recipe.ts`, `src/utils/shoppingList.ts`, `src/utils/functionErrors.ts`, `src/services/supabase.ts`.
- Produces in `src/services/recipeService.ts`:
  - `fetchRecipes(filterMealType?: MealType): Promise<Recipe[]>`
  - `fetchUserRecipes(filterMealType?: MealType): Promise<Recipe[]>`
  - `fetchRecipeById(id: string, source?: RecipeSource): Promise<Recipe | null>`
  - `generateAiRecipe(input: GenerateRecipeRequest): Promise<Recipe>`
  - `toggleUserRecipeFavorite(recipeId: string, isFavorite: boolean): Promise<boolean>`
  - `deleteUserRecipe(recipeId: string): Promise<void>`
- Produces in `src/hooks/useRecipes.ts`:
  - `useRecipes(filterMealType?)`, `useUserRecipes(filterMealType?)`, `useRecipeDetail(recipeId, source?)`, `useGenerateRecipe()`, `useToggleRecipeFavorite()`, `useDeleteUserRecipe()`
- Produces in `src/services/shoppingListService.ts` & `src/hooks/useShoppingList.ts`:
  - `fetchShoppingList(userId)`, `addRecipeToShoppingList(userId, recipe, servings?)`, `addManualShoppingItem(userId, input)`, `toggleShoppingItem(userId, itemId, checked)`, `clearCheckedShoppingItems(userId)`, `deleteShoppingItem(userId, itemId)`
  - `useShoppingList()` retornando `{ items, pendingCount, groupedItems, isLoading, error, refetch, addRecipeIngredients, addManualItem, toggleItem, clearChecked, removeItem, isAdding, isMutating }`

- [ ] **Step 1: Escribir `src/services/__tests__/recipeService.test.ts` y `src/services/__tests__/shoppingListService.test.ts`**.
- [ ] **Step 2: Ejecutar `npx jest src/services/__tests__/recipeService.test.ts src/services/__tests__/shoppingListService.test.ts`** para confirmar fallo inicial.
- [ ] **Step 3: Actualizar `src/services/recipeService.ts` y `src/hooks/useRecipes.ts`**.
- [ ] **Step 4: Crear `src/services/shoppingListService.ts` y `src/hooks/useShoppingList.ts`**.
- [ ] **Step 5: Ejecutar tests de servicios y `npm run type-check`**.

---

### Task 4: Pantallas UI (`/recipes`, `AiRecipeGeneratorModal`, `/recipes/[id]`, `/recipes/shopping-list`)

**Files:**
- Create: `src/components/recipes/AiRecipeGeneratorModal.tsx`
- Modify: `app/recipes/index.tsx`
- Modify: `app/recipes/[id].tsx`
- Create: `app/recipes/shopping-list.tsx`

**Interfaces:**
- Consumes: `useRecipes`, `useUserRecipes`, `useGenerateRecipe`, `useRecipeDetail`, `useToggleRecipeFavorite`, `useDeleteUserRecipe`, `useShoppingList`, `useDailyNutrition`, `useDietaryPreferences`, `useAiConsent`, `AiConsentModal`, `showToast`, `showAlert`, `formatShoppingListForShare`.

- [ ] **Step 1: Crear `src/components/recipes/AiRecipeGeneratorModal.tsx`** con lectura de macros restantes (`useDailyNutrition`), chips de tipo/tiempo, stepper de porciones, campo de ingredientes disponibles, nota opcional, verificación de consentimiento IA (`AiConsentModal`) e invocación de `useGenerateRecipe`.
- [ ] **Step 2: Actualizar `app/recipes/index.tsx`** con barra superior ("✨ Generar con IA" y "🛒 Compras (N)"), tabs Todas / Mis Recetas IA / Catálogo, badge `"✨ Receta IA"` y filtro dietético unificado.
- [ ] **Step 3: Actualizar `app/recipes/[id].tsx`** con parámetro `source`, selector de porciones a cocinar/comprar, formato correcto de `unit` (`unid` / `g` / `ml`), botón **"🛒 Agregar ingredientes a Compras"** y controles de Favorito/Eliminar en recetas IA, manteniendo **"🍽️ Registrar esta Receta en mi Día"** compatible con `DetectedFoodItemSchema`.
- [ ] **Step 4: Crear `app/recipes/shopping-list.tsx`** agrupada por categoría chilena, formulario rápido manual, toggle check persistente, "Limpiar comprados" y "📋 Copiar / Compartir".

---

### Task 5: Verificación Completa e Integración Final

- [ ] **Step 1:** Ejecutar `npm run type-check` (`tsc --noEmit`).
- [ ] **Step 2:** Ejecutar `npm run lint` (`eslint .`).
- [ ] **Step 3:** Ejecutar `npm test -- --runInBand`.
- [ ] **Step 4:** Ejecutar `npx deno check --config supabase/functions/deno.json` sobre todas las Edge Functions incluyendo `generate-recipe/index.ts`.
- [ ] **Step 5:** Ejecutar `npm run build:pwa` y verificar la salida `dist/`.
