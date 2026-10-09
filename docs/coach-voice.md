# Coach: respuestas legibles y voz

El coach ofrece dos controles distintos:

- **Escuchar** lee una respuesta guardada con la voz del navegador o dispositivo, en español. No hace llamadas a un proveedor de IA. **Detener** cancela la lectura; cambiar de respuesta o salir de la pantalla también la detiene.
- **Conversar por voz** abre Gemini Live en la web/PWA con permiso explícito de micrófono. Permite escuchar respuestas y hablar para interrumpirlas. **Terminar conversación**, salir de la pantalla o enviar la app al fondo libera el micrófono. La app cierra cada sesión a los dos minutos.

El chat guarda los turnos de voz que contienen tanto una pregunta transcrita como una respuesta. Se conservan al recargar. No se guardan grabaciones de audio. Un turno pendiente al cerrar la sesión puede quedar sin guardar.

La conversación en vivo requiere HTTPS (o localhost), micrófono, WebSocket y AudioWorklet. Está implementada para navegadores compatibles; las apps nativas iOS/Android ofrecen lectura con `expo-speech`, pero todavía no transmiten audio en vivo. La reproducción depende de las voces y el volumen del dispositivo.

## Mensajes y contexto

Los títulos, negritas y listas se muestran con formato. Las tablas antiguas se convierten en fichas con etiquetas y cantidades, sin modificar el historial almacenado. El renderizador usa componentes de texto: no ejecuta HTML ni enlaces generados.

Texto y voz comparten las metas, registros del día, actividad, agua, plan compacto y seis mensajes recientes. La fecha y el día se calculan en `America/Santiago`. El prompt pide respuestas directas, porciones prácticas, cifras coherentes y las metas exactas; evita tablas nuevas y suplementos por defecto.

## Configuración del servidor

En Supabase, añade estos secretos desde un archivo local ignorado:

```dotenv
GEMINI_LIVE_API_KEY=clave-de-un-proyecto-gratuito-confirmado
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_LIVE_ENABLED=true
COACH_LIVE_SIGNING_SECRET=valor-aleatorio-de-al-menos-32-caracteres
```

Publica `nutrition-coach` y `coach-live-session` con el import map `supabase/functions/deno.json`. No se necesita una migración de base de datos. Las claves adicionales del chat se mantienen en `GEMINI_API_KEY_ADDITIONAL`, separadas por comas y sin reemplazar las anteriores.

`coach-live-session` autentica al usuario, carga su contexto y reserva una solicitud de la cuota de la app por sesión. Solicita a Google un token de un uso, con configuración de modelo y contexto fijada en el servidor. El navegador recibe ese token temporal y una prueba firmada para guardar transcripciones; nunca recibe la clave de Google ni la de servicio de Supabase.

La conexión usa `BidiGenerateContentConstrained` con el token temporal. En el REST actual, las restricciones se envían como `bidiGenerateContentSetup`. El audio de entrada es PCM mono de 16 bits a 16 kHz; el de salida, 24 kHz. El cliente conserva el orden de los mensajes y vacía el audio pendiente al recibir una interrupción.

El guardado comprueba la firma, cuenta, vencimiento, longitudes y número de turno (1–20). Inserta pregunta y respuesta en una sola operación, con IDs deterministas para que un reintento no duplique mensajes. Las transcripciones enviadas por el cliente se identifican como tales y se tratan como datos, nunca como instrucciones privilegiadas.

La expiración del token restringe el inicio de conexiones; **el cierre a los dos minutos lo ejecuta el cliente**, no una desconexión forzada por Google. La prueba de guardado tiene un minuto adicional para completar solicitudes en curso.

## Cuotas y gratuidad

Se habilitó únicamente `gemini-3.8-live`, probado con la nueva clave cuyo proyecto el usuario confirmó como **Free / Gratis** en AI Studio. No hay respaldo a OpenAI ni a otro modelo de voz de pago. Una suscripción de consumidor no determina las cuotas de la API; estas dependen del proyecto y modelo. Si Live agota su cuota, quedan disponibles el chat con sus respaldos y la lectura del dispositivo. La integración no activa facturación.

Fuentes oficiales verificadas el 9 de octubre de 2026: [Live API](https://ai.google.dev/gemini-api/docs/live-api), [tokens temporales](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens), [audio e interrupciones](https://ai.google.dev/gemini-api/docs/live-api/capabilities), [precios](https://ai.google.dev/gemini-api/docs/pricing), [cuotas](https://ai.google.dev/gemini-api/docs/rate-limits) y [Expo Speech](https://docs.expo.dev/versions/v52.0.0/sdk/speech/).

Ver [pruebas y publicación](coach-voice-release-2026-10-09.md).
