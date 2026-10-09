# Task Plan: Optimizar, limpiar y ordenar Nutricionapp

## Goal
Optimizar, limpiar y organizar el proyecto Nutricionapp en la rama `chore/project-cleanup`, realizando primero una auditoría detallada, aplicando mejoras por lotes pequeños (organización/docs, código/tipos, rendimiento medido) conservando el coach, la voz, integraciones gratuitas y secretos, ejecutando verificaciones y generando el informe completo en `docs/project-cleanup-report.md`.

## Current Phase
Phase 2: Lote 1 - Organización y Documentación

## Next Step
Ejecutar Lote 1: Organizar documentación y scripts, retirar dependencias sin uso verificadas (`query-string`), limpiar código huérfano y redactar `docs/project-cleanup-report.md`.

## Phases

### Phase 1: Auditoría y Línea Base
- [x] Ejecutar verificaciones iniciales (`type-check`, `lint`, `test -- --runInBand`, `build:pwa`, `git diff --check`, Deno check)
- [x] Analizar documentación clave (`README`, `ai-providers.md`, `coach-voice.md`, etc.) y configs
- [x] Generar inventario de carpetas, responsabilidades, dependencias, duplicaciones y candidatos a código muerto
- [x] Registrar línea base cuantitativa y hallazgos en `findings.md`
- Status: complete

### Phase 2: Lote 1 - Organización y Documentación
- [ ] Retirar dependencias y código sin uso comprobados (`query-string`, `QuickLogModal.tsx`)
- [ ] Organizar documentación y scripts por propósito conservando puntos de entrada y enlaces
- [ ] Crear documento inicial `docs/project-cleanup-report.md` con auditoría completa
- [ ] Ejecutar verificaciones intermedias (`type-check`, `lint`, `test`, `build:pwa`)
- [ ] Realizar commit del Lote 1
- Status: in_progress

### Phase 3: Lote 2 - Código, Tipos y Unificación
- [ ] Unificar utilidades y tipos duplicados
- [ ] Estandarizar manejo de errores y contratos
- [ ] Modularizar pantallas/componentes sobredimensionados que lo justifiquen sin romper rutas de Expo Router
- [ ] Verificar compatibilidad frontend-backend (imports compartidos desde Deno Edge Functions)
- [ ] Ejecutar verificaciones intermedias (`type-check`, `lint`, `test`)
- Status: pending

### Phase 4: Lote 3 - Rendimiento Medido y Dependencias
- [ ] Analizar tamaño de bundle antes/después y re-renders
- [ ] Optimizar memoización/consultas donde haya evidencia
- [ ] Revisar dependencias en `package.json`
- [ ] Registrar métricas cuantitativas antes/después
- Status: pending

### Phase 5: Verificación Integral y Reporte Final
- [ ] Ejecutar suite completa: `type-check`, `lint`, `test -- --runInBand`, `build:pwa`, `git diff --check`
- [ ] Comprobar tipos de las 5 Edge Functions en Deno
- [ ] Completar `docs/project-cleanup-report.md` con evidencia, cambios, métricas y estado para revisión
- [ ] Revisar diff final en `chore/project-cleanup` sin publicar a producción
- Status: pending

## Decisions Made
| Decision | Rationale | Impact |
|---|---|---|
| Usar rama `chore/project-cleanup` | Requerido por la especificación de la tarea | Aislamiento seguro sin tocar main ni producción |
| Proteger Edge Functions y rutas de Expo Router | Edge functions importan desde `src/` y Expo Router depende de rutas en `app/` | Prevenir roturas silenciosas |

## Errors Encountered
| Error | Attempt | Resolution |
|---|---|---|
