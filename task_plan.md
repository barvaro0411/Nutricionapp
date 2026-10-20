# Task Plan: Optimizar, limpiar y ejecutar Roadmap de Nutricionapp

## Goal
Optimizar, limpiar y organizar el proyecto Nutricionapp, y ejecutar el plan de trabajo por etapas (Inmediato, Corto plazo y base técnica de Mediano plazo) conservando el coach, la voz, las integraciones gratuitas y los secretos, con verificación completa en TypeScript, ESLint, Jest, Deno y compilación PWA.

## Current Phase
Completado — Lista para revisión y despliegue de migración Supabase.

## Phases

### Phase 1: Auditoría, Limpieza y Optimización Base
- [x] Ejecutar verificaciones iniciales (`type-check`, `lint`, `test -- --runInBand`, `build:pwa`, `git diff --check`, Deno check)
- [x] Retirar dependencias y código sin uso (`query-string`, `@expo/vector-icons`, `QuickLogModal.tsx`)
- [x] Modularizar `app/meal/review.tsx` y `app/meal/barcode.tsx` y unificar utilidades (`nutritionCalculator.ts`, `functionErrors.ts`)
- [x] Reducir bundle web inicial con tree-shaking de íconos (`scripts/babel-icon-imports.cjs`) y carga diferida de `@zxing/library`
- Status: complete

### Phase 2: Inmediato (1–3 días)
- [x] Corregir trial y cuota en servidor (`activate_free_trial`, `check_and_increment_ai_quota`); eliminar mensaje de éxito falso en cliente/paywall
- [x] Añadir CI en GitHub Actions (`.github/workflows/ci.yml`) con `npm ci`, `lint`, `type-check`, `tests`, `deno check` y `build:pwa`
- [x] Actualizar `findings.md`, `progress.md` y `task_plan.md`
- Status: complete

### Phase 3: Corto plazo (1–2 semanas)
- [x] Migración de procedencia para el catálogo local (`Catálogo Chileno` vs `USDA FoodData Central`) y ajuste de UI
- [x] Tabla `public.weight_logs` con RLS y sincronización cliente/servidor en `weightService.ts`
- [x] Eliminación de cuenta (`delete_own_account`), Política de Privacidad, Términos de Uso (`/legal`) y consentimiento explícito de IA (`AiConsentModal`, `ai_consent_at`)
- [x] Cabecera `Content-Security-Policy` en `vercel.json`, `.gitignore` para artefactos, limpieza de `supabase/.private` y ramas locales obsoletas
- Status: complete

### Phase 4: Mediano plazo (Base técnica)
- [x] Adaptador de pagos (`PaymentProviderAdapter` / `registerPaymentAdapter`) y flujo de suscripción en `subscriptionService.ts`
- [x] Configuración `eas.json` para builds iOS/Android y suite E2E base con Playwright (`playwright.config.ts`, `e2e/smoke.spec.ts`)
- [x] Desacoplamiento de `expo-av` mediante `src/utils/audioAdapter.ts` con importación dinámica
- [x] Code splitting de la PWA (`React.lazy` en modales secundarios + chunks asíncronos) y reducción adicional del bundle inicial
- Status: complete

## Decisions Made
| Decision | Rationale | Impact |
|---|---|---|
| Trial de 7 días controlado por servidor (`activate_free_trial`) | Evitar manipulación desde cliente y falsos positivos cuando RLS bloquea escrituras directas en `subscriptions` | 1 prueba gratuita real por cuenta y confirmación real en UI |
| Mantener 1 llamada RPC por invocación en Edge Functions | Los tests contractuales de Edge Functions verifican una única llamada RPC (`reserve_ai_request`) por request | Compatibilidad total con la suite de pruebas de funciones |
| Aislar `expo-av` en `src/utils/audioAdapter.ts` con `import("expo-av")` | Preparar reemplazo futuro por `expo-audio` y sacar `expo-av` del bundle inicial de la PWA | Menor peso inicial en web y punto único de cambio para audio nativo |
