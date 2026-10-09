# Continuación del coach y fiabilidad diaria — 9 de octubre de 2026

El usuario retomó la tarea con «continúa con el coach». Se aplicó la migración, se publicaron las cinco funciones y se probó el nuevo frontend con los proveedores reales. Ver el cierre y la versión publicada en [coach-daily-release-2026-10-09.md](coach-daily-release-2026-10-09.md).

## Avance guardado

- Mascota SVG animada en el coach, estados al pensar/escuchar/hablar, panel de bienvenida y errores con reintento en pantalla. La animación respeta movimiento reducido y se detiene al salir o mandar la app al fondo.
- El chat asigna un UUID por consulta, evita envíos simultáneos y reutiliza ese UUID al reintentar el mismo texto. El backend permite recuperar respuestas guardadas sin repetir IA ni cuota. La migración guarda los dos mensajes y la respuesta en una transacción.
- Cooldowns por hash de credencial y modelo, compartidos por RPC privados con `AI_PROVIDER_HEALTH_SHARED=true`. Protección local si el almacén compartido no responde. Respeto de `Retry-After`, reinicios de Groq y límite diario Gemini hasta medianoche del Pacífico.
- Gemini comparte un plazo total entre claves. Esperas de reintento cancelables. Se mantienen proveedores gratuitos y no se activa la API de pago OpenAI.
- Caché acotada para traducciones del buscador, deduplicación concurrente, aislamiento por usuario para consultas privadas y sin cachear errores.
- Cuota de la app conserva 100 consultas diarias y 10 por minuto; el RPC distingue ambos límites e indica tiempo de espera. El límite diario se renueva en la zona America/Santiago.

## Verificaciones realizadas

- `npm.cmd test -- --runInBand`: **220 pruebas, 30 suites, todas pasan**.
- `npm.cmd run type-check` y `npm.cmd run lint`: pasan.
- `node supabase/.private/coach-check.cjs`: cinco funciones Edge, cero errores de tipos.
- Pruebas nuevas verifican cooldowns entre instancias, aislamiento por clave/modelo, expiración, fallo del almacén, cuotas diarias, caché concurrente y solicitudes del coach idempotentes.

Pasaron además cinco verificaciones reales de base de datos, cinco flujos con proveedores y diez comprobaciones de navegador. Gemini Live respondió con audio y dejó un turno completo guardado. Las cuentas, la imagen y el registro de cooldown sintéticos se eliminaron al finalizar.

## Publicación realizada

1. Fuente aislada desde `origin/main` (`5c53456`) y superposición únicamente de los archivos del coach/APIs. Se conservaron fuera de la publicación los cambios locales pendientes y los dos commits de limpieza anteriores en `chore/project-cleanup`.
2. Respaldo del RPC `public.reserve_ai_request(uuid,integer,integer)` y migración `20261009000000_daily_ai_reliability.sql` aplicada y registrada en una transacción en Supabase `ylirrvllpwghktugbdxh`.
3. `AI_PROVIDER_HEALTH_SHARED=true` configurado conservando los demás secretos. Funciones `analyze-meal`, `parse-meal-text`, `search-foods`, `nutrition-coach` y `coach-live-session` publicadas antes del frontend.
4. Versión Vercel preparada con `--prod --skip-domain`, sin secretos privados en la fuente ni el bundle. Se verificaron chat, recuperación tras perder una respuesta, cuotas, imagen/texto/audio/buscador, voz, animación, movimiento reducido y diseño móvil/escritorio antes de promoverla.

La etapa queda terminada. No volver a aplicar esa migración; consultar el estado remoto antes de nuevas publicaciones.

## Herramientas locales disponibles

Los scripts y evidencias de `supabase/.private/` son ignorados por Git y Vercel. No imprimir sus secretos ni subirlos.

- `daily-release.cjs`: preparación corregida para ignorar entradas directorio y utilizar la base publicada. Sus modos `prepare`, `backend`, `stage` y `promote` corresponden a esta publicación; contienen comprobaciones específicas y no deben reutilizarse ciegamente para la siguiente versión.
- `daily-browser.cjs`, generado con `prepare-daily-browser.cjs`: diez comprobaciones completas; incluye animación, movimiento reducido y pérdida de respuesta/reintento con el mismo UUID.
- `daily-db-check.cjs`: cinco comprobaciones reales de concurrencia, transacción, permisos, cooldown compartido y límites diarios/minuto.
- `ai-providers-live.cjs production`: cinco flujos reales; la cuenta y la imagen temporales se eliminaron.
- `daily-final-check.cjs`: verifica secretos, integridad del bundle y barrera de autenticación del coach.
- `coach-release.cjs` corresponde a la publicación anterior: **no reutilizar sus modos `functions` o `stage` para esta etapa**, porque contienen supuestos de versión antigua y publican desde el árbol de trabajo.

Hay cambios locales anteriores en `src/hooks/useDailyNutrition.ts`, `src/services/usdaService.ts`, `src/stores/useMealReviewStore.ts`, `src/utils/nutritionCalculator.ts`, su prueba y `src/components/meal/ReviewPortionGuide.tsx`. Se conservaron, sin revertirlos, incluirlos en el commit de esta etapa ni publicarlos.

Las cuotas de proveedores externos siguen siendo autoritativas. Más claves del mismo proyecto Gemini comparten cuota y la app no puede garantizar disponibilidad ilimitada.
