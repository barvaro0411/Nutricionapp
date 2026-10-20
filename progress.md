# Progress: Nutricionapp Project Cleanup & Roadmap

## Session Log

- **2026-10-09**:
  - Creada rama `chore/project-cleanup`.
  - Iniciado `task_plan.md`, `findings.md`, `progress.md`.
  - Ejecutadas verificaciones base (`type-check`, `lint`, `test`, `build:pwa`, `deno check`).
  - Completada auditoría inicial, eliminación de dependencias sin uso (`query-string`, `@expo/vector-icons`), modularización de pantallas (`review.tsx`, `barcode.tsx`) y reducción del bundle web de **2.57 MB** a **1.49 MB**.

- **2026-10-20**:
  - Sincronizado repositorio local con `origin` (`chore/project-cleanup` y `main` en `f238e8d`).
  - **Inmediato (1–3 días)**:
    - Creada migración `supabase/migrations/20261020000000_roadmap_hardening_and_features.sql` con `activate_free_trial`, endurecimiento de `check_and_increment_ai_quota` (`America/Santiago` + validación de período activo), `valid_nutrition_reference` para `'Catálogo Chileno'`, tabla `weight_logs` con RLS y `delete_own_account()`.
    - Actualizados `src/services/subscriptionService.ts`, `src/hooks/useSubscription.ts` y `app/paywall/index.tsx` para usar `activate_free_trial` en servidor y eliminar el mensaje de éxito falso.
    - Creado workflow de CI en `.github/workflows/ci.yml` (`npm ci`, `type-check`, `lint`, `test`, `deno check` y `build:pwa`).
    - Actualizados `findings.md`, `progress.md` y `task_plan.md`.
  - **Corto plazo (1–2 semanas)**:
    - Actualizada procedencia del catálogo local a `"Catálogo Chileno"` en `src/types/meal.ts`, `src/services/usdaService.ts`, `MealReviewItemCard.tsx`, `UsdaSearchModal.tsx` y `MealCard.tsx`.
    - Sincronizado `src/services/weightService.ts` con `public.weight_logs` y `public.profiles.target_weight_kg` manteniendo respaldo local offline.
    - Implementados `src/services/privacyService.ts`, `src/hooks/useAiConsent.ts`, `src/components/common/AiConsentModal.tsx`, `app/legal/index.tsx`, eliminación de cuenta en `src/hooks/useAuth.ts` y sección de Privacidad y Cuenta en `app/(tabs)/settings.tsx`.
    - Añadida cabecera `Content-Security-Policy` en `vercel.json`, actualizadas reglas de artefactos en `.gitignore`, eliminado directorio `supabase/.private` y eliminadas ramas locales obsoletas (`codex/usda-complete`, `chore/project-cleanup`).
  - **Mediano plazo (Base técnica lista)**:
    - Añadido adaptador de pasarela de pago (`registerPaymentAdapter`, `purchaseProPlan`) en `src/services/subscriptionService.ts`.
    - Creados `eas.json`, `playwright.config.ts` y `e2e/smoke.spec.ts`.
    - Aislado `expo-av` en `src/utils/audioAdapter.ts` con importación dinámica y aplicado code-splitting (`React.lazy`) a modales secundarios en `app/(tabs)/index.tsx` y `app/(tabs)/record.tsx`.
