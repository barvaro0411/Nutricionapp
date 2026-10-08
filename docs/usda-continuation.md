# Punto de continuación: integración USDA

Estado al detener el trabajo el 8 de octubre de 2026. La implementación está en curso; no darla por terminada ni promover el frontend hasta resolver la prueba real.

## Objetivo autorizado

Ampliar USDA más allá de las once referencias iniciales, complementando Gemini en foto/texto/audio; permitir búsqueda manual en español; conservar referencias en comidas, historial y favoritas. Publicar en los proyectos existentes de Supabase/Vercel y guardar el trabajo en GitHub. No se necesita volver a pedir autorización para esos destinos ya autorizados.

## Implementado

- Búsqueda general en Foundation, SR Legacy y Survey (FNDDS), con caché acotada, deduplicación, lotes de veinte IDs y recuperación ante errores.
- Descriptores de búsqueda en los prompts y selección validada de candidatos. Controles de cocción, ingredientes y valores incompletos; energía Atwater de Foundation.
- Conversión de líquidos usando porciones pesadas de USDA y equivalencias de volumen documentadas.
- Nueva función `search-foods`, autenticación explícita mediante `auth.getUser`, validación de entrada y cuota existente.
- Buscador en español en la revisión: agregar alimentos o sustituir su referencia y reconstruir ratios.
- Fuente persistente en comidas/favoritas e indicación en historial; migración y tipos actualizados.
- Documentación en `docs/usda-integration.md` y pruebas ampliadas.

## Verificaciones

- 143 pruebas en 22 suites pasan.
- TypeScript de frontend y las tres funciones Edge pasa; ESLint pasa sin advertencias.
- Exportación PWA pasa; clave USDA ausente del código publicable y del bundle.
- Consultas reales USDA confirmaron `Pasta, cooked` (2708357), `Spaghetti sauce with meat` (2706470) y porciones pesadas de leche.
- La prueba real de enriquecimiento automático FALLÓ: Gemini detectó fideos, salsa, manzana y leche, pero ninguno recibió referencia USDA. La respuesta tardó aproximadamente 72,7 segundos y conservó estimaciones.
- La reproducción local encontró HTTP 429 al usar la clave local de Gemini, tanto con el modelo local como con el modelo configurado en producción. Esto no prueba aún que la misma causa explique el fallo remoto: investigar sin asumirlo.

## Estado remoto

- Supabase: proyecto `ylirrvllpwghktugbdxh`.
- Migración `20261008000000_usda_complete` aplicada. Se conservaron los diez ítems anteriores; se agregaron dos columnas de procedencia. Los RPC anteriores están respaldados localmente.
- Publicados `analyze-meal`, `parse-meal-text` y `search-foods`. El enriquecimiento opcional conserva la estimación si falla.
- Vercel: proyecto `nutricionapp`, `prj_xpMJ7iR8zkdkYGjWdZTa3yAfRAnD`, equipo `team_M17DUR4Kn9NfnqdsYfdn6XNn`.
- Nueva versión preparada y verificada, **sin promover ni cambiar el dominio**: `dpl_4ebraXT3mzMPhnsfUgsrS9QEGx41`, https://nutricionapp-apl7yk7up-barvaro0411s-projects.vercel.app.
- Dominio público: https://dist-two-alpha-18.vercel.app. Mantiene el frontend anterior, despliegue `dpl_9a6DZRtHwCFjLuK3ceBaGy8HbPgX`.
- Todos los usuarios de prueba se eliminaron; sesiones usadas solo en memoria.

## Próximos pasos

1. Investigar por qué no se aplica el enriquecimiento real. Se agregó logging de códigos operativos a `usdaSearch.ts` después de desplegar; esa última modificación todavía no está en Supabase.
2. Revisar cuota/tiempo del segundo llamado Gemini y evitar que una selección adicional vuelva inútil el enriquecimiento. Mantener IDs y cocción verificables; no sustituir por el primer resultado arbitrariamente.
3. Corregir ejemplos contradictorios del prompt: para salsa con carne, `spaghetti sauce with meat` encuentra la salsa; `tomato meat sauce` devuelve primero platos completos. El modelo ignoró la alternativa en la primera prueba real.
4. Verificar manualmente `search-foods`, la persistencia real, reutilización de favoritas, conversión ml y autenticación. Estas partes de la prueba real no se alcanzaron porque la primera aserción falló.
5. Ejecutar prueba de navegador: detectar pasta/salsa, agregar desde USDA, cambiar cantidad, guardar, recargar historial y comprobar favoritas. Falta adaptar el script del navegador anterior.
6. Repetir comprobaciones únicamente tras los cambios pertinentes; respaldar/deplegar las funciones corregidas. Si cambió frontend, preparar y verificar una versión nueva de Vercel.
7. Solo después de las pruebas reales exitosas promover y asignar el dominio público, verificarlo y llevar la rama de continuación a `main`.

## Herramientas locales

Los helpers y evidencias están en `supabase/.private/`, excluidos de Git: `usda-complete-production.cjs`, `usda-complete-local.cjs`, `usda-complete-db.cjs`, `usda-complete-release.cjs`, `usda-complete-check.cjs` y archivos de evidencia/estado. Revisarlos antes de ejecutar: algunos modos publican o modifican datos. No repetir la migración ya aplicada ni ejecutar el antiguo `prepare-remote.cjs`, que incluye operaciones ajenas a esta tarea.

La clave local está en `.env.usda.local` y el secreto remoto `USDA_API_KEY` ya existe. No imprimir credenciales ni subir `.env*`, sesiones o respaldos. Vercel no necesita la clave USDA: la consume Supabase.

CLI autenticados en caché local:

- Supabase: `C:/Users/alvaro/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/supabase/dist/supabase.js`.
- Vercel: `C:/Users/alvaro/AppData/Local/npm-cache/_npx/69f9afb961c37556/node_modules/vercel/dist/vc.js`.

Usar `npm.cmd` en PowerShell. Las operaciones de Git y red pueden requerir escalación del sandbox. No crear un endpoint diagnóstico temporal: una propuesta anterior de ese tipo fue rechazada por la revisión automática. Usar logs normales y funciones autenticadas de la aplicación.
