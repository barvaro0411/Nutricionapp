# Publicación del coach: formato y voz — 9 de octubre de 2026

La web/PWA ofrece lectura de respuestas y conversación con Gemini Live. Los mensajes anteriores con Markdown se muestran con títulos, negritas, listas y fichas de alimentos. El coach de texto y voz comparte contexto nutricional y usa la fecha real de Chile.

## Cambios publicados

- `nutrition-coach`: contexto compartido, instrucciones más concretas y marcas de tiempo distintas para conservar el orden de pregunta y respuesta.
- `coach-live-session`: autenticación, cuota de inicio, token temporal con contexto fijado, transcripciones y guardado atómico con protección ante reintentos.
- Frontend: controles Escuchar/Detener y Conversar/Terminar; entrada PCM de micrófono, salida de audio, interrupciones, limpieza al salir y límite de sesión de dos minutos.
- La nueva clave gratuita se añadió al conjunto de respaldos Gemini y al secreto de voz; se conservaron las claves anteriores. Ninguna clave privada se incorporó al frontend ni a Git.

## Verificación

- 206 pruebas en 29 suites, incluida autenticación, cuotas, contexto, firma de sesión, acceso entre cuentas, vencimiento, guardado, cancelación antes y después del permiso de micrófono, interrupción de audio y orden de transcripciones.
- TypeScript de frontend y cinco funciones Edge sin errores; ESLint y compilación PWA correctos.
- Navegador real a 390 y 1366 píxeles: formato de un mensaje antiguo, controles de lectura, chat contextual, conversación en vivo, historial después de recargar y ausencia de desbordamiento horizontal.
- Gemini Live `gemini-3.8-live` recibió una pregunta hablada por un micrófono sintético, devolvió **236640 bytes de audio** y guardó un turno completo. Tanto texto como voz respondieron **1805 calorías restantes**, coherentes con la meta de 2000 y las 195 registradas; reconocieron viernes como día actual.
- Terminar la conversación dejó todas las pistas de micrófono en estado `ended`. La cuenta de prueba se eliminó. El mensaje antiguo conservó exactamente su contenido en la base de datos.
- La lectura por voz se verificó con un sustituto del motor de voz del navegador. No se afirma una prueba auditiva en un teléfono físico; Gemini Live sí devolvió audio real.

El despliegue frontend preparado para publicación es `dpl_7Jn54aibDy92P9KcWFa6uTuKSBSD`. Su publicación utiliza el proyecto Vercel existente y el enlace [de producción](https://dist-two-alpha-18.vercel.app). Las dos funciones se publicaron en el Supabase existente; no hubo migraciones ni cambios de facturación.

Antes de publicar el backend se guardó un archivo privado del código Git `29fb871`, correspondiente a la publicación anterior del coach. Es un respaldo del código de aquella publicación, no una descarga exacta del paquete remoto: el descargador de Supabase rechaza la dependencia relativa fuera de `supabase/functions`, y se conserva esa protección.

Ver [configuración y límites de voz](coach-voice.md) y [distribución de proveedores](ai-providers.md).
