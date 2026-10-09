# Punto de continuación: integración USDA

Actualizado el 9 de octubre de 2026. Los pendientes del 8 de octubre están resueltos: pruebas reales de API y navegador aprobadas, backend corregido y frontend publicado en el dominio existente. Ver [evidencias y límites de la publicación](usda-release-2026-10-09.md).

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

- 150 pruebas en 22 suites pasan.
- TypeScript de frontend y las tres funciones Edge pasa; ESLint pasa sin advertencias.
- Exportación PWA pasa; clave USDA ausente del código publicable y del bundle.
- Consultas reales USDA confirmaron `Pasta, cooked` (2708357), `Spaghetti sauce with meat` (2706470) y porciones pesadas de leche.
- La reproducción local identificó HTTP 429 en la cuota de tokens de entrada de Gemini con la misma clave configurada en producción. Se redujo el prompt a seis candidatos por alimento, conservando ambas formulaciones, y se limitó el plazo de las llamadas opcionales.
- La prueba real final obtuvo cuatro referencias USDA para fideos, salsa con carne, manzana y leche en aproximadamente 7,1 segundos. La salsa usa `Spaghetti sauce with meat`, sin incluir pasta ni un plato de carne con salsa.
- Búsqueda manual en español, conversión ml, persistencia en comidas/favoritas, reutilización, idempotencia y rechazo de metadatos inválidos y solicitudes anónimas: aprobados.
- Navegador móvil en la versión preparada y en el dominio público: análisis de fideos/salsa, agregado manual USDA, cambio de cantidades, guardado, recarga/historial y favoritas aprobados, sin errores de JavaScript.

## Estado remoto

- Supabase: proyecto `ylirrvllpwghktugbdxh`.
- Migración `20261008000000_usda_complete` aplicada. Se conservaron los diez ítems anteriores; se agregaron dos columnas de procedencia. Los RPC anteriores están respaldados localmente.
- Publicados `analyze-meal`, `parse-meal-text` y `search-foods`. El enriquecimiento opcional conserva la estimación si falla.
- Vercel: proyecto `nutricionapp`, `prj_xpMJ7iR8zkdkYGjWdZTa3yAfRAnD`, equipo `team_M17DUR4Kn9NfnqdsYfdn6XNn`.
- Versión verificada y promovida: `dpl_4ebraXT3mzMPhnsfUgsrS9QEGx41`, https://nutricionapp-apl7yk7up-barvaro0411s-projects.vercel.app. El frontend preparado el 8 de octubre se reutilizó porque las correcciones de esta continuación afectan al backend.
- Dominio público verificado: https://dist-two-alpha-18.vercel.app. Sirve el frontend USDA y pasó la prueba completa de navegador tras promoverlo.
- Todos los usuarios de prueba se eliminaron; sesiones usadas solo en memoria.

## Cierre de los pendientes

1. Diagnóstico y logs operativos publicados, sin claves ni texto de usuarios.
2. Candidatos acotados y plazos compartidos entre reintentos/claves de respaldo; fallos opcionales conservan referencias previas y estimaciones.
3. Prompts coherentes, término indexado de salsa aplicado también por el servidor y controles de platos completos, con/sin carne y piel/cáscara.
4. Prueba de API real aprobada con cuenta temporal eliminada.
5. Prueba completa de navegador aprobada en preparación y producción con cuentas temporales eliminadas.
6. Funciones respaldadas antes de publicar; compilación, tipos, lint y secretos verificados.
7. Frontend promovido y dominio público verificado. El cierre y la integración de la rama se conservan en Git.

## Herramientas locales

Los helpers y evidencias están en `supabase/.private/`, excluidos de Git: `usda-complete-production.cjs`, `usda-complete-local.cjs`, `usda-complete-db.cjs`, `usda-complete-release.cjs`, `usda-complete-check.cjs` y archivos de evidencia/estado. Revisarlos antes de ejecutar: algunos modos publican o modifican datos. No repetir la migración ya aplicada ni ejecutar el antiguo `prepare-remote.cjs`, que incluye operaciones ajenas a esta tarea.

La clave local está en `.env.usda.local` y el secreto remoto `USDA_API_KEY` ya existe. No imprimir credenciales ni subir `.env*`, sesiones o respaldos. Vercel no necesita la clave USDA: la consume Supabase.

CLI autenticados en caché local:

- Supabase: `C:/Users/alvaro/AppData/Local/npm-cache/_npx/aa8e5c70f9d8d161/node_modules/supabase/dist/supabase.js`.
- Vercel: `C:/Users/alvaro/AppData/Local/npm-cache/_npx/69f9afb961c37556/node_modules/vercel/dist/vc.js`.

Usar `npm.cmd` en PowerShell. Las operaciones de Git y red pueden requerir escalación del sandbox. No crear un endpoint diagnóstico temporal: una propuesta anterior de ese tipo fue rechazada por la revisión automática. Usar logs normales y funciones autenticadas de la aplicación.
