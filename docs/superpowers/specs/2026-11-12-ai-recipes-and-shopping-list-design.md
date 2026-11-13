# Especificación de Diseño: Sub-proyecto 2 — Generador de Recetas IA + Lista de Compras Inteligente

**Fecha:** 2026-11-12  
**Estado:** Aprobado para Planificación e Implementación  
**Autor:** Antigravity & Usuario  

---

## 1. Resumen y Contexto

Hasta ahora, [`app/recipes/index.tsx`](../../../app/recipes/index.tsx) y [`app/recipes/[id].tsx`](../../../app/recipes/%5Bid%5D.tsx) muestran únicamente el catálogo estático compartido (`public.recipes` y `public.recipe_ingredients`) con filtro por horario y compatibilidad dietética (Sub-proyecto 1). Los usuarios no pueden generar recetas personalizadas con IA ajustadas a sus macros restantes ni gestionar una lista de compras con los ingredientes de sus recetas.

Este sub-proyecto incorpora:
1. **Generador de Recetas IA (`generate-recipe`)** que produce recetas chilenas/cotidianas ajustadas automáticamente a las restricciones dietéticas, alergias personalizadas y macros restantes del usuario, guardándolas por defecto en su biblioteca privada (`public.user_recipes`).
2. **Lista de Compras Inteligente (`public.shopping_list_items` + `app/recipes/shopping-list.tsx`)** sincronizada en Supabase con fusión atómica por ingrediente y unidad, clasificación automática por categoría de supermercado en Chile, ítems manuales, checks persistentes y exportación lista para WhatsApp/Notas.

---

## 2. Objetivos y No Objetivos

### Objetivos
- Persistir recetas privadas generadas por IA en `public.user_recipes` con RLS estricto (`(SELECT auth.uid()) = user_id`), favoritos y eliminación.
- Persistir la lista de compras activa por usuario en `public.shopping_list_items` con RLS estricto y RPC atómico `public.upsert_shopping_list_items(p_items jsonb)` para sumar cantidades sin duplicados ni condiciones de carrera.
- Crear Edge Function `supabase/functions/generate-recipe/index.ts` usando `generateText` (Gemini ↔ Groq), `reserveAiRequest` (1 sola llamada RPC de cuota) y `loadUserDietaryPreferencesBestEffort` (Sub-proyecto 1).
- Validar con Zod todos los ingredientes y recalcular los totales por porción en el servidor para garantizar coherencia exacta al registrar una receta en `/meal/review`.
- Exponer flujo completo en `/recipes` (tabs Todas / Mis Recetas IA / Catálogo + CTA "Generar con IA" + acceso a Lista de Compras con contador de pendientes), `/recipes/[id]` (soporte dual catálogo/IA + selector de porciones + agregar a compras) y `/recipes/shopping-list` (agrupación por categorías chilenas, alta manual, checks optimistas, limpiar comprados y copiar/compartir texto).
- Respetar el consentimiento previo de procesamiento IA (`useAiConsent` + `AiConsentModal`) antes de invocar `generate-recipe`.

### No Objetivos
- Múltiples listas de compras nombradas por usuario (se implementa una única lista activa sincronizada).
- Pre-generación de menús semanales completos o checklists diarios de hábitos (corresponden al Sub-proyecto 3).
- Edición libre de pasos/ingredientes de recetas IA después de generadas (solo favorito, eliminación, registro de porción en `/meal/review` y envío a compras).

---

## 3. Modelo de Datos y Migración SQL (`20261112010000_ai_recipes_and_shopping_list.sql`)

### 3.1. Tabla `public.user_recipes`
Columnas:
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
- `title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 2 AND 120)`
- `description text`
- `meal_type text NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'cena', 'snack'))`
- `prep_time_minutes integer NOT NULL DEFAULT 20 CHECK (prep_time_minutes BETWEEN 1 AND 300)`
- `servings integer NOT NULL DEFAULT 1 CHECK (servings BETWEEN 1 AND 12)`
- `calories_per_serving numeric(7, 2) NOT NULL CHECK (calories_per_serving >= 0)`
- `protein_per_serving numeric(7, 2) NOT NULL CHECK (protein_per_serving >= 0)`
- `carbs_per_serving numeric(7, 2) NOT NULL CHECK (carbs_per_serving >= 0)`
- `fat_per_serving numeric(7, 2) NOT NULL CHECK (fat_per_serving >= 0)`
- `ingredients jsonb NOT NULL CHECK (jsonb_typeof(ingredients) = 'array' AND jsonb_array_length(ingredients) BETWEEN 1 AND 30)`  
  Cada elemento almacena totales de la receta completa: `{ id, foodName, grams, unit ('g'|'ml'|'unidad'), quantity, calories, protein, carbs, fat, category }`.
- `instructions text[] NOT NULL CHECK (coalesce(array_length(instructions, 1), 0) BETWEEN 1 AND 20)`
- `prompt_context jsonb`
- `is_favorite boolean NOT NULL DEFAULT false`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Seguridad e índices:
- `CREATE INDEX IF NOT EXISTS idx_user_recipes_user_created ON public.user_recipes (user_id, created_at DESC);`
- Trigger `trg_touch_updated_at` reutilizando `public.touch_updated_at()`.
- RLS habilitado con políticas `SELECT`, `INSERT`, `UPDATE`, `DELETE` usando `(SELECT auth.uid()) = user_id` (`REVOKE ALL ON public.user_recipes FROM PUBLIC, anon; GRANT SELECT, INSERT, UPDATE, DELETE TO authenticated; GRANT ALL TO service_role;`).

### 3.2. Tabla `public.shopping_list_items` y RPC `upsert_shopping_list_items`
Columnas:
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
- `name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100)`
- `normalized_key text NOT NULL CHECK (char_length(trim(normalized_key)) BETWEEN 1 AND 100)`
- `quantity numeric(8, 2) NOT NULL CHECK (quantity > 0)`
- `unit text NOT NULL DEFAULT 'g' CHECK (unit IN ('g', 'ml', 'unidad'))`
- `category text NOT NULL DEFAULT 'otros' CHECK (category IN ('verduras_frutas', 'proteinas', 'lacteos_huevos', 'despensa_granos', 'condimentos_aceites', 'otros'))`
- `checked boolean NOT NULL DEFAULT false`
- `source_recipes text[] NOT NULL DEFAULT '{}'`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Unicidad, índices y RPC:
- Constraint único: `UNIQUE (user_id, normalized_key, unit)`.
- Índice: `CREATE INDEX IF NOT EXISTS idx_shopping_list_user_state ON public.shopping_list_items (user_id, checked, category, created_at DESC);`
- Trigger `trg_touch_updated_at` con `public.touch_updated_at()`.
- RLS habilitado de mínimo privilegio con `(SELECT auth.uid()) = user_id`.
- Función `public.upsert_shopping_list_items(p_items jsonb) RETURNS SETOF public.shopping_list_items` (`LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''`):
  - Valida `auth.uid() IS NOT NULL` (`42501`), `jsonb_typeof(p_items) = 'array'` y `jsonb_array_length(p_items) BETWEEN 1 AND 50` (`22023`).
  - Por cada ítem realiza `INSERT ... ON CONFLICT (user_id, normalized_key, unit) DO UPDATE`:
    - Si `s.checked = true`, reemplaza `quantity = EXCLUDED.quantity` y pone `checked = false`.
    - Si `s.checked = false`, suma `round(s.quantity + EXCLUDED.quantity, 2)` (tope `999999`).
    - Conserva categoría existente si ya era distinta de `'otros'`, y agrega el título de receta origen sin duplicar (máx. 10).
  - Retorna todas las filas actualizadas del usuario ordenadas por `checked ASC, category ASC, created_at DESC`.
- `NOTIFY pgrst, 'reload schema';`.

---

## 4. Backend IA (`supabase/functions/generate-recipe/`)

### 4.1. Contrato de Entrada y Salida
- **`GenerateRecipeRequestSchema` (`types.ts`):**
  - `mealType`: `'desayuno' | 'almuerzo' | 'cena' | 'snack'` opcional
  - `maxPrepMinutes`: entero `10..120` opcional
  - `servings`: entero `1..6` (default `1`)
  - `availableIngredients`: `string[]` (máx. `12`, cada uno `1..40` chars) opcional
  - `cravingNote`: `string` (máx. `140` chars) opcional
  - `targetMacros`: `{ calories?: number, protein?: number, carbs?: number, fat?: number }` opcional
- **`AIRecipeOutputSchema` (`types.ts`):**
  - `title` (`2..120`), `description` (máx. `280`), `mealType`, `prepTimeMinutes` (`1..300`), `servings` (`1..6`), `ingredients` (`2..20` ítems con `foodName`, `grams` `1..10000`, `unit: 'g'|'ml'|'unidad'`, `quantity` opcional `0.1..500`, `calories/protein/carbs/fat >= 0`, `category`), `instructions` (`2..15` pasos).

### 4.2. Flujo de `generate-recipe/index.ts`
1. Verifica método `POST` (`methodResponse`), autentica sesión (`authenticate`) y lee JSON (`readBody`, máx. `16384` bytes).
2. Valida payload con `GenerateRecipeRequestSchema`.
3. Resuelve `optionalGeminiKey(client)` y reserva cuota con `await reserveAiRequest(client, user.id)` (1 sola llamada RPC).
4. Carga restricciones y alergias con `loadUserDietaryPreferencesBestEffort(client, user.id)`.
5. Construye prompt chileno/cotidiano incluyendo preferencias dietéticas estrictas, ingredientes disponibles, tiempo máx, porciones y macros objetivo, invocando `generateText` (`json: true`, `maxTokens: 2048`, `temperature: 0.35`).
6. Parsea JSON con `parseModelJson`, recalcula sumas totales desde `ingredients` divididas por `servings` para garantizar consistencia matemática entre ingredientes y macros por porción, normaliza categorías si hiciera falta, inserta la fila en `public.user_recipes` y responde `{ success: true, data: savedRow, meta: { model, latency_ms } }`.
7. Agregar `supabase/functions/generate-recipe/index.ts` al check de Deno en [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml).

---

## 5. Capa Cliente, Normalización y Pantallas

### 5.1. Utilidades Puras (`src/utils/shoppingList.ts` y `src/types/recipe.ts`)
- `normalizeShoppingIngredientKey(name)`: quita tildes (`NFD`), paréntesis aclaratorios, espacios repetidos y singulariza plurales españoles comunes (`huevos → huevo`, `tomates → tomate`, `limones → limon`, `porotos → poroto`, preservando palabras terminadas en `-s/-z` que no corresponden a plural regular cuando aplica o mapeo consistente).
- `categorizeIngredientChile(foodName)`: asigna automáticamente una de las 6 categorías de supermercado chileno (`verduras_frutas`, `proteinas`, `lacteos_huevos`, `despensa_granos`, `condimentos_aceites`, `otros`).
- `buildShoppingItemsFromRecipe(recipe, targetServings?)`: escala cantidades por `targetServings / recipe.servings`, usa `ing.quantity` cuando `ing.unit === 'unidad'` y `ing.grams` para `'g'`/`'ml'`, fusiona ingredientes repetidos dentro de la misma receta y etiqueta `sourceRecipe = recipe.title`.
- `mergeShoppingListPreview(existing, incoming)`: espejo puro cliente de la regla SQL de fusión para pruebas y consistencia UI.
- `formatShoppingListForShare(items)`: agrupa ítems pendientes por `SHOPPING_CATEGORY_LABELS` con formato legible para WhatsApp/Notas.

### 5.2. Servicios y Hooks (`recipeService.ts`, `useRecipes.ts`, `shoppingListService.ts`, `useShoppingList.ts`)
- **`recipeService.ts`**: agrega `fetchUserRecipes`, actualización en `fetchRecipeById(id, source?)` para resolver catálogo o `user_recipes` (con fallback automático si `source` no viene en la URL), `generateAiRecipe`, `toggleUserRecipeFavorite` y `deleteUserRecipe`. Al enviar ingredientes a `/meal/review`, conserva `grams` reales y `"g" | "ml"` para mantener compatibilidad estricta con `DetectedFoodItemSchema`.
- **`shoppingListService.ts` + `useShoppingList.ts`**: consultas y mutaciones sobre `shopping_list_items` y `upsert_shopping_list_items`, con actualizaciones optimistas al marcar/desmarcar ítems y rollback limpio en caso de error.

### 5.3. Interfaz de Usuario
- **[`app/recipes/index.tsx`](../../../app/recipes/index.tsx)**: botones superiores **"Generar Receta IA"** y **"Compras (N)"**, tabs de origen (**Todas / Mis Recetas IA / Catálogo**), badge `"✨ Receta IA"` y compatibilidad dietética aplicada sobre ambos listados.
- **`src/components/recipes/AiRecipeGeneratorModal.tsx`**: lee macros restantes del día (`useDailyNutrition`), ofrece toggle para usar esos macros como meta, selectores de horario/tiempo/porciones, campo de ingredientes disponibles y nota breve; exige consentimiento IA (`AiConsentModal`) si aún no está otorgado y redirige a `/recipes/[id]?source=ai` al finalizar.
- **[`app/recipes/[id].tsx`](../../../app/recipes/%5Bid%5D.tsx)**: selector de porciones para preparar/comprar, visualización correcta de unidades (`unid`, `g`, `ml`), botón **"Agregar a Lista de Compras"**, acciones de Favorito / Eliminar en recetas privadas y botón existente **"Registrar esta Receta en mi Día"** adaptado a porciones.
- **`app/recipes/shopping-list.tsx`**: checklist agrupado por categorías chilenas, formulario de alta manual rápida (nombre + cantidad + unidad), botón eliminar por ítem, botón **"Limpiar comprados"** y **"Copiar / Compartir lista"** (`navigator.clipboard` en web con fallback a `Share.share` nativo).

---

## 6. Manejo de Errores y Verificación

- Todos los errores de Edge Function usan [`extractFunctionErrorMessage`](../../../src/utils/functionErrors.ts) (429 cuota, 503 proveedor/BD, 400 entrada inválida) manteniendo los datos del formulario intactos.
- Pruebas Jest: `shoppingList.test.ts`, `recipeService.test.ts`, `shoppingListService.test.ts` y pruebas de contrato en `supabase/functions/__tests__/generateRecipeHandler.test.js` (validación Zod, 1 sola llamada `reserve_ai_request`, recálculo de macros desde ingredientes, inyección de restricciones/alergias).
- Suite completa: `npm run type-check`, `npm run lint`, `npm test -- --runInBand`, `deno check --config supabase/functions/deno.json ...`, `npm run build:pwa`.
