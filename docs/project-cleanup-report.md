# Informe de Limpieza, Optimización y Organización — Nutricionapp

**Fecha**: 9 de octubre de 2026  
**Rama de trabajo**: `chore/project-cleanup`  
**Commit base**: `5c53456` (sucesor de `74fd076`)  
**Entorno**: Expo SDK 52 / React Native / TypeScript 5.3 / Supabase Edge Functions (Deno 2.9.6)

---

## 1. Resumen Ejecutivo y Auditoría Inicial

Se auditó de forma exhaustiva el repositorio `Nutricionapp` con el fin de optimizar, limpiar y organizar la base de código conservando estrictamente:
- El asistente y coach contextualizado con fechas en `America/Santiago`.
- El subsistema de voz (lectura con voz del dispositivo y conversación interactiva en tiempo real con Gemini Live en web/PWA).
- Las integraciones gratuitas (Groq, Gemini, USDA FoodData Central) y la política de selección única por consulta para evitar sobreconsumo de cuotas.
- Todos los secretos de servidor y variables de entorno protegidas (`.env*`, `supabase/.private/`).
- La integridad de la cadena de suministro (`patches/`, overrides de seguridad, `postinstall`, `scripts/check-tooling-security.cjs`).

### 1.1 Línea Base de Verificación (Estado Previo)
| Comando / Verificación | Resultado Línea Base | Tiempo / Métrica |
|---|---|---|
| `npm.cmd run type-check` | ✅ Aprobado (0 errores) | ~3s |
| `npm.cmd run lint` | ✅ Aprobado (0 errores, 0 advertencias) | ~2s |
| `npm.cmd test -- --runInBand` | ✅ Aprobado (29 suites, 206 pruebas) | ~8.8s |
| `npm.cmd run build:pwa` | ✅ Aprobado (1326 módulos, PWA inyectada) | 3143ms, bundle 2.57 MB |
| `git diff --check` | ✅ Limpio | Sin errores de formato |
| `npx deno check (5 Edge Functions)` | ✅ Aprobado (5 funciones verificadas) | analyze-meal, coach-live-session, nutrition-coach, parse-meal-text, search-foods |

---

## 2. Inventario de Hallazgos y Diagnóstico

### 2.1 Código Huérfano y Componentes No Utilizados
- **`src/components/dashboard/QuickLogModal.tsx`**: Componente de 300 líneas con modal alternativo de registro rápido. Tras comprobar referencias estáticas, dinámicas y de plugins (`git grep`), se evidenció que no tenía ningún import ni uso activo en la aplicación. Todo el flujo de registro fue unificado en la pantalla `app/(tabs)/record.tsx` con `TextVoiceModal` y `FavoritesModal`.
  - **Acción**: Eliminado de manera segura.

### 2.2 Dependencias y Parches de Seguridad
- **`query-string` (`^7.1.3`)**: Se detectó que el código de la app no importa este paquete (la app utiliza `URLSearchParams` nativo en `app/_layout.tsx`). Sin embargo, existe un parche crítico `patches/query-string+7.1.3.patch` que es validado obligatoriamente por `patch-package --error-on-fail` en el hook `postinstall`.
  - **Decisión**: Conservar `query-string` en `package.json` para honrar la regla de preservación de parches y evitar roturas en la instalación en frío.
- **`@expo/vector-icons` (`~14.0.4`)**: Es requerida internamente por el ecosistema de Expo SDK 52, pero los componentes de la aplicación usan exclusivamente `lucide-react-native` con resolución directa de iconos mediante el plugin Babel `scripts/babel-icon-imports.cjs`. Se conserva como dependencia compatible del SDK.

### 2.3 Modularización de Componentes Extensos
- **`app/meal/review.tsx` (1,263 líneas)**: Pantalla con sobrecarga de responsabilidades:
  - Formulario de agregado manual con validaciones y selector de unidades `g`/`ml`.
  - Tarjeta de guía visual de calibración de porciones chilenas (palma, puño, cuchara).
  - Tarjetas interactivas de edición de alimentos detectados con selector de variantes, búsqueda USDA y ajustes finos de porciones.
  - Gran cantidad de estilos acoplados.
- **`app/meal/barcode.tsx` (1,229 líneas)**: Pantalla de código de barras que mezcla vista de cámara, búsqueda manual, tarjeta de resultado de producto y formulario de alta manual con cámara de etiquetas.

### 2.4 Duplicación de Lógica y Manejo de Errores
- **Extracción de errores de Edge Functions**: `src/services/usdaService.ts` implementaba un extractor manual ad-hoc de `error.context`, omitiendo el helper estandarizado `extractFunctionErrorMessage` de `src/utils/functionErrors.ts`.
- **Cálculo de totales nutricionales**: Lógica de sumatoria de calorías y macros con redondeo a 1 decimal repetida en `useMealReviewStore.ts` y `useDailyNutrition.ts`.

### 2.5 Rendimiento y Re-renders
- En `MealReviewScreen`, `getTotals()` se ejecutaba sincrónicamente en cada render sin `useMemo`, y las tarjetas de alimentos no contaban con memoización granular.

---

## 3. Plan de Mejoras por Lotes

- **Lote 1: Organización y Documentación**
  - Creación de índice general `docs/README.md`.
  - Actualización de `README.md` con scripts completos y referencias a funciones.
  - Retiro del componente huérfano `QuickLogModal.tsx`.
  - Documentación de hallazgos y preservación de parches.
- **Lote 2: Código, Tipos y Unificación**
  - Estandarización de `usdaService.ts` utilizando `extractFunctionErrorMessage`.
  - Extracción de utilidades de sumatoria y cálculo de macros en `src/utils/nutritionCalculator.ts`.
  - Desacoplamiento de subcomponentes de `app/meal/review.tsx`:
    - `src/components/meal/ReviewPortionGuide.tsx`
    - `src/components/meal/ManualAddFoodForm.tsx`
    - `src/components/meal/MealReviewItemCard.tsx`
  - Verificación de tipos en frontend y Edge Functions en Deno.
- **Lote 3: Rendimiento Medido y Verificación Integral**
  - Memoización de `totals` y componentes de renderizado intensivo.
  - Medición comparativa de compilación y tamaño del bundle PWA.
  - Ejecución de la suite completa de 29 suites de tests y comprobaciones Deno.
