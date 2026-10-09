# Continuación del coach y fiabilidad diaria — 9 de octubre de 2026

El usuario pidió guardar el avance y retomar después para poder apagar el PC. Esta etapa está implementada y verificada localmente, **todavía no publicada**. No se aplicó la nueva migración ni se cambiaron los secretos o funciones en producción. La aplicación disponible sigue siendo la versión anterior en https://dist-two-alpha-18.vercel.app.

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

Todavía faltan las pruebas reales en navegador y proveedores de esta etapa. La voz de Gemini Live se probó y publicó en la versión anterior; falta volver a comprobarla con estos cambios.

## Próximos pasos

1. Revisar el estado de Git y conservar los cambios locales ajenos a esta etapa. El avance quedó en la rama `chore/project-cleanup`, que ya contenía dos commits de limpieza anteriores a esta etapa. Para publicar únicamente coach/APIs, crear fuente aislada desde la base publicada `origin/main` (`5c53456`) y superponer los archivos propios de esta etapa. Corregir también esa base en `daily-release.cjs`, que inicialmente usa HEAD. No publicar directamente el árbol de trabajo con cambios ajenos pendientes.
2. Hacer respaldo del RPC `public.reserve_ai_request(uuid,integer,integer)` y confirmar que la versión `20261009000000` no está aplicada. Aplicar `supabase/migrations/20261009000000_daily_ai_reliability.sql` en una transacción y registrar la versión. Destino ya autorizado: Supabase `ylirrvllpwghktugbdxh`.
3. Configurar únicamente `AI_PROVIDER_HEALTH_SHARED=true` en secretos Supabase, conservando claves y configuración actuales. Publicar `analyze-meal`, `parse-meal-text`, `search-foods`, `nutrition-coach` y `coach-live-session` con el import map existente. **Publicar el backend y aplicar la migración antes del nuevo frontend**, que ya envía `request_id`.
4. Crear una versión Vercel con `--prod --skip-domain` en el proyecto existente `nutricionapp`, usando la fuente aislada. Verificar exclusión de secretos y archivos privados. No activar facturación ni proveedores de pago.
5. Probar con una cuenta temporal propia: chat con metas/comidas, simular pérdida de respuesta y reintentar el mismo UUID, comprobar respuesta cacheada, solo dos mensajes y contador sin incremento adicional; probar imagen/texto/audio/buscador; animación y movimiento reducido; lectura y Gemini Live con audio real; móvil/escritorio y limpieza de la cuenta temporal.
6. Promover solamente la versión probada y actualizar el alias público existente. Documentar resultados y guardar el cierre en GitHub.

## Herramientas locales disponibles

Los scripts y evidencias de `supabase/.private/` son ignorados por Git y Vercel. No imprimir sus secretos ni subirlos.

- `daily-release.cjs`: prepara fuente aislada, respalda el RPC, aplica migración y publica cinco funciones, crea versión Vercel y promueve tras comprobar evidencia. **La preparación quedó detenida con un error `EISDIR` al leer una entrada directorio de `vercel deploy --dry`; falta añadir `if (fs.statSync(absolute).isDirectory()) continue` antes de leer esos bytes y volver a ejecutar `prepare`.** No llegó al modo `backend` ni `stage`.
- `daily-browser.cjs`, generado con `prepare-daily-browser.cjs`: extiende la prueba previa con animación, movimiento reducido y pérdida de respuesta/reintento. Falta ejecutarlo y resolver cualquier fallo real.
- `ai-providers-live.cjs production`: prueba proveedores con cuenta e imagen temporales y los elimina al finalizar. Las aserciones de proveedores principales pueden necesitar distinguir un respaldo legítimo si la cuota de una cuenta está agotada.
- `coach-release.cjs` corresponde a la publicación anterior: **no reutilizar sus modos `functions` o `stage` para esta etapa**, porque contienen supuestos de versión antigua y publican desde el árbol de trabajo.

Hay cambios locales anteriores en `src/hooks/useDailyNutrition.ts`, `src/services/usdaService.ts`, `src/stores/useMealReviewStore.ts`, `src/utils/nutritionCalculator.ts`, su prueba y `src/components/meal/ReviewPortionGuide.tsx`. Se conservaron, sin revertirlos, incluirlos en el commit de esta etapa ni publicarlos.

Las cuotas de proveedores externos siguen siendo autoritativas. Más claves del mismo proyecto Gemini comparten cuota y la app no puede garantizar disponibilidad ilimitada.
