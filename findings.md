# Findings: Nutricionapp Cleanup & Roadmap Implementation

## 1. Initial Baseline Findings (2026-10-09)

- **Branch inicial**: `chore/project-cleanup` creada desde `main` (`5c53456`), posteriormente integrada por fast-forward a `main` (`f238e8d`).
- **TypeScript**: `npm.cmd run type-check` (`tsc --noEmit`) pasa limpio con código 0.
- **ESLint**: `npm.cmd run lint` (`eslint .`) pasa limpio con código 0.
- **Pruebas Jest (base)**: 29 suites pasadas, 206 pruebas pasadas.
- **Compilación PWA (base)**:
  - 1326 módulos empaquetados, bundle único de **2.57 MB**.
- **Edge Functions Deno**: `npx deno check` limpio en las 5 funciones (`analyze-meal`, `coach-live-session`, `nutrition-coach`, `parse-meal-text`, `search-foods`).

## 2. Hallazgos Resueltos en Limpieza y Optimización

1. **Dependencias sin uso eliminadas**:
   - `query-string` y `@expo/vector-icons` retiradas tras verificar 0 usos y migrar iconografía a `lucide-react-native` con `scripts/babel-icon-imports.cjs`.
2. **Archivos huérfanos y artefactos limpiados**:
   - Eliminado `src/components/dashboard/QuickLogModal.tsx` (reemplazado por `app/(tabs)/record.tsx`).
   - Eliminado directorio local `supabase/.private` y ramas locales obsoletas (`codex/usda-complete`, `chore/project-cleanup` tras fast-forward a `main`).
   - Endurecido `.gitignore` para excluir `playwright-report/`, `test-results/`, `coverage/`, `*.tsbuildinfo` y `.playwright/`.
3. **Modularización y desduplicación**:
   - `app/meal/review.tsx` y `app/meal/barcode.tsx` modularizados en subcomponentes bajo `src/components/meal/`.
   - Unificación de cálculo de macros (`roundMacro`, `sumMacroTotals`) en `src/utils/nutritionCalculator.ts` y extracción de errores HTTP de Edge Functions con `extractFunctionErrorMessage`.

## 3. Hallazgos y Soluciones del Roadmap (Inmediato, Corto y Mediano Plazo)

1. **Trial y Cuota en Servidor (Inmediato)**:
   - **Hallazgo**: `subscriptionService.ts` tenía un fallback silencioso `{ allowed: true }` cuando fallaba `check_and_increment_ai_quota` e intentaba hacer `.upsert()` directo desde el cliente sobre `public.subscriptions` (bloqueado por RLS), mostrando un mensaje de éxito falso.
   - **Solución**: Se creó el RPC `public.activate_free_trial(p_plan_id text)` (`SECURITY DEFINER`) con control de 1 prueba de 7 días por usuario (`trial_started_at`), se actualizó `public.check_and_increment_ai_quota` para permitir invocación autenticada sobre `auth.uid()` con zona horaria `America/Santiago` y validación de `current_period_end > now()`, y se eliminó el mensaje de éxito falso en cliente/paywall.
2. **CI/CD Automatizado (Inmediato)**:
   - **Solución**: Añadido `.github/workflows/ci.yml` con `npm ci`, `npm run type-check`, `npm run lint`, `npm test -- --runInBand`, `deno check` de las 5 Edge Functions y `npm run build:pwa`.
3. **Procedencia del Catálogo Local Chileno (Corto Plazo)**:
   - **Hallazgo**: Los alimentos del catálogo chileno local se etiquetaban como `"USDA FoodData Central"` en `usdaService.ts` para cumplir el `CHECK` de base de datos.
   - **Solución**: Migración SQL actualiza `public.valid_nutrition_reference(jsonb)` para aceptar `source IN ('USDA FoodData Central', 'Catálogo Chileno')`; `NutritionReferenceSchema`, `usdaService.ts` y componentes UI (`MealReviewItemCard`, `UsdaSearchModal`, `MealCard`) distinguen explícitamente `"Catálogo Chileno"` vs `"USDA"`.
4. **Tabla `weight_logs` con RLS y Sincronización (Corto Plazo)**:
   - **Hallazgo**: `weightService.ts` guardaba el historial de peso y meta únicamente en almacenamiento local del dispositivo.
   - **Solución**: Creada tabla `public.weight_logs` con RLS por `auth.uid() = user_id` y columna `target_weight_kg` en `public.profiles`, con sincronización bidireccional y soporte offline en `src/services/weightService.ts`.
5. **Eliminación de Cuenta, Privacidad, Términos y Consentimiento IA (Corto Plazo)**:
   - **Solución**: RPC `public.delete_own_account()` (`SECURITY DEFINER`) que limpia objetos en `storage.objects` (`meal_photos`) y elimina la cuenta en `auth.users`; columna `ai_consent_at` en `public.profiles`; modal `AiConsentModal` previo al uso de cámara/voz/texto con IA; pantalla pública `/legal` y controles de privacidad/eliminación en `app/(tabs)/settings.tsx`.
6. **CSP, Pagos, EAS, E2E, Audio Adapter y Code Splitting (Corto y Mediano Plazo)**:
   - **CSP**: Cabecera `Content-Security-Policy` añadida en `vercel.json`.
   - **Pagos**: Contrato `PaymentProviderAdapter` + `registerPaymentAdapter` en `src/services/subscriptionService.ts` listo para RevenueCat o pasarela local.
   - **Builds & E2E**: Añadidos `eas.json`, `playwright.config.ts` y `e2e/smoke.spec.ts`.
   - **Desacoplamiento de `expo-av` y Code Splitting PWA**: Creado `src/utils/audioAdapter.ts` con importación dinámica de `expo-av` y carga diferida (`React.lazy` + `Suspense`) de modales secundarios en `app/(tabs)/index.tsx` y `app/(tabs)/record.tsx`.
