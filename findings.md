# Findings: Nutricionapp Project Cleanup

## Initial Baseline Findings

- **Branch**: `chore/project-cleanup` creada desde `main` (commit `5c53456`, sucesor inmediato de `74fd076`).
- **TypeScript**: `npm.cmd run type-check` (`tsc --noEmit`) pasa limpio con código 0.
- **ESLint**: `npm.cmd run lint` (`eslint .`) pasa limpio con código 0.
- **Pruebas Jest**: `npm.cmd test -- --runInBand` pasa con **29 suites pasadas, 29 total; 206 pruebas pasadas, 206 total**. Tiempo: ~8.8s.
- **Compilación PWA**: `npm.cmd run build:pwa` (`expo export --platform web && node scripts/patch-pwa.js`) genera exitosamente:
  - 1326 módulos empaquetados en 3143ms.
  - Bundle web: `_expo/static/js/web/entry-6b433c5b1421fbf6286299efe8afffaa.js` (**2.57 MB**).
  - PWA: 26 recursos, versión `4fb935c3215c`.
- **Git diff check**: `git diff --check` limpio sin errores de whitespace.
- **Edge Functions Deno**: `npx deno check --config supabase/functions/deno.json ...` pasa limpio en las 5 funciones:
  - `analyze-meal/index.ts`
  - `coach-live-session/index.ts`
  - `nutrition-coach/index.ts`
  - `parse-meal-text/index.ts`
  - `search-foods/index.ts`
- **Dependencia compartida Frontend <-> Backend**: `supabase/functions/_shared/coachContext.ts` importa directamente `../../../src/utils/dates.ts` (`APP_TIME_ZONE`, `getDateKey`, `getDayRange`, `getWeekday`). Debe mantenerse la ruta y extensión `.ts`.

## Code & Inventory Findings

1. **Dependencias sin uso**:
   - `query-string` (`^7.1.3` en `dependencies`): 0 usos en todo el proyecto. El proyecto utiliza `URLSearchParams` estándar de Web API en `app/_layout.tsx`.
   - `@expo/vector-icons` (`~14.0.4` en `dependencies`): 0 usos en todo el código. La aplicación utiliza exclusivamente `lucide-react-native`, optimizada con plugin Babel (`scripts/babel-icon-imports.cjs`).
2. **Archivos huérfanos / no referenciados**:
   - `src/components/dashboard/QuickLogModal.tsx` (300 líneas): Nunca importado en la aplicación. Todo el registro fue unificado en `app/(tabs)/record.tsx` con `RecordScreen`, `TextVoiceModal` y `FavoritesModal`.
   - `src/hooks/useSubscription.ts`: Archivo con `export {};` stub deliberado para no romper imports antiguos si los hubiera.
   - `src/services/subscriptionService.ts`: Stub de cobros con error deliberado (modo beta gratuito).
3. **Oportunidades de modularización**:
   - `app/meal/review.tsx` (1,263 líneas): Pantalla excesivamente grande que mezcla en un solo archivo:
     - Formulario modal de agregar alimento manual (~150 líneas)
     - Tarjetas complejas de edición de alimentos detectados con variantes, ajustes de porción +/-10g y referencias USDA (~250 líneas)
     - Guía visual de porciones chilenas (~30 líneas)
     - Estilos CSS masivos (~600 líneas)
   - `app/meal/barcode.tsx` (1,229 líneas): Pantalla con escaneo de cámara web/nativo, búsqueda manual, escaneo de etiquetas y formulario de producto manual.
4. **Duplicaciones de utilidades**:
   - `src/services/usdaService.ts` reimplementa manualmente la lógica de extracción de mensaje de error de Edge Functions que ya provee `src/utils/functionErrors.ts` (`extractFunctionErrorMessage`).
   - Cálculo de totales de nutrientes (`calories`, `protein`, `carbs`, `fat` con redondeo a 1 decimal) duplicado en `useMealReviewStore.ts` y `useDailyNutrition.ts`.
5. **Rendimiento**:
   - En `MealReviewScreen`, `totals` se recalcula en cada ciclo de render sin memoización.
   - Los componentes de ítems en `MealReviewScreen` se vuelven a renderizar en bloque cuando cualquier estado local cambia.

