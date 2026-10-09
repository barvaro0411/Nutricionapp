# Proveedores de IA y consumo

Las funciones distribuyen las modalidades entre Groq, Gemini y USDA. Las claves se guardan en Supabase y el cliente conserva los mismos contratos de respuesta.

| Trabajo | Principal | Respaldo |
| --- | --- | --- |
| Coach con metas, comidas e historial | Groq `openai/gpt-oss-120b` | Gemini |
| Conversación por voz en la web/PWA | Gemini `gemini-3.8-live`, con token temporal | Chat y lectura del dispositivo si la voz no está disponible |
| Lectura de respuestas guardadas | Voz del navegador/dispositivo | Sin llamadas a IA |
| Interpretación de texto | Groq `openai/gpt-oss-20b` | Gemini |
| Dictado de comidas | Groq `whisper-large-v3-turbo`, luego extracción de texto | Gemini recibe el audio original si falla la transcripción |
| Fotos y etiquetas nutricionales | Gemini `gemini-3.5-flash-lite` | Groq `qwen/qwen3.8-27b` |
| Traducción y selección de referencias USDA | Groq `openai/gpt-oss-20b` | Gemini |
| Nutrientes verificables | USDA FoodData Central | Estimación previa si el enriquecimiento opcional falla |

El prefijo `openai/` en los modelos GPT-OSS identifica modelos abiertos ejecutados **en Groq**. La app no llama a la API de pago de OpenAI: el antiguo adaptador visual quedó fuera de los handlers y una clave `OPENAI_API_KEY` no activa ningún respaldo.

## Paralelismo y ahorro

- El coach obtiene perfil, metas, comidas, historial, plan, actividad y agua en paralelo. Envía contexto nutricional compacto y seis mensajes recientes, sin nombre ni identificadores de cuenta.
- USDA busca dos formulaciones por alimento, deduplica búsquedas simultáneas y conserva caché acotada dentro de cada instancia. Obtiene detalles en hasta tres lotes concurrentes de veinte IDs.
- El buscador traduce etiquetas mientras USDA obtiene los nutrientes. Conserva las descripciones originales si falla esa traducción.
- Cada consulta selecciona un proveedor y recurre al siguiente cuando falla; enviar la misma pregunta simultáneamente a todos duplicaría consumo. La transcripción precede a la extracción porque esta depende del texto obtenido.
- El respaldo comparte un plazo total. Las claves Gemini reparten ese plazo para que una clave detenida deje tiempo a las siguientes. Errores 401, 403 y 429 permiten avanzar sin repetir la misma clave.
- Los errores 429, de configuración o temporales suspenden esa credencial y modelo. Con `AI_PROVIDER_HEALTH_SHARED=true` y la migración `20261009000000`, el estado se comparte entre funciones e instancias mediante RPC privados, con hashes SHA-256 de las claves. Si esa consulta falla, queda protección local. Se respeta `Retry-After`, los reinicios de cuotas de Groq y la medianoche del Pacífico para límites diarios de Gemini. Una credencial inválida suspende sus modelos; no suspende las demás claves. Los errores de negocio y autenticación no activan otra interpretación.
- Groq reintenta hasta tres veces únicamente errores HTTP transitorios, dentro del plazo. GPT-OSS usa razonamiento bajo sin devolver pensamientos; Qwen usa el modo sin razonamiento y un prompt visual compacto. La prueba con el prompt largo recibió 429 (`Limit 1000`, `Requested 1027`); el compacto obtuvo respuesta válida en la misma cuenta.

Se mantienen los controles de sesión, propiedad de imágenes, esquemas, preparación, porciones y procedencia USDA. Se reserva una sola solicitud de la cuota de la app aunque el flujo utilice transcripción, extracción, USDA y respaldo. Los valores predeterminados siguen siendo **100 solicitudes por usuario al día y 10 por minuto**, configurables mediante `AI_DAILY_LIMIT` y `AI_MINUTE_LIMIT`.

El coach envía un UUID por mensaje. La base guarda atómicamente ambos mensajes y su respuesta; un reintento de la misma consulta devuelve esa respuesta sin llamar a la IA ni reservar cuota nuevamente. Las consultas simultáneas con ese UUID reciben una indicación de espera. El resultado se conserva durante 24 horas y solo lo maneja el backend; las conversaciones continúan en su historial habitual.

La etapa del coach animado y fiabilidad diaria está publicada: [versión y pruebas reales](coach-daily-release-2026-10-09.md).

Las traducciones del buscador tienen caché acotada de seis horas y deduplicación concurrente. La traducción de consultas se aísla por usuario; las etiquetas de referencias públicas USDA pueden reutilizarse. Los fallos no se guardan en caché. El contador de la app distingue el límite de minuto del diario; el diario se renueva a medianoche en Chile y las respuestas incluyen el plazo para reintentar.

## Secretos del servidor

La plantilla [`.env.example`](../.env.example) contiene solo ejemplos. El cliente utiliza únicamente `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Guarda localmente un archivo ignorado, por ejemplo `.env.ai.local`, con los valores del servidor:

```dotenv
GROQ_API_KEY=tu-clave-groq
GROQ_COACH_MODEL=openai/gpt-oss-120b
GROQ_TEXT_MODEL=openai/gpt-oss-20b
GROQ_VISION_MODEL=qwen/qwen3.8-27b
GROQ_AUDIO_MODEL=whisper-large-v3-turbo
GEMINI_API_KEY=tu-clave-principal
GEMINI_API_KEY_FALLBACK=tu-clave-opcional
GEMINI_API_KEY_ADDITIONAL=otra-clave-opcional
GEMINI_MODEL=gemini-3.5-flash-lite
USDA_API_KEY=tu-clave-usda
```

Publica esos secretos con `supabase secrets set --project-ref TU_PROYECTO --env-file .env.ai.local`. Para agregar una clave a un proyecto ya configurado, usa un archivo que contenga únicamente `GEMINI_API_KEY_ADDITIONAL`; así conservas la principal y los respaldos anteriores. También se reconoce `GEMINI_API_KEY_BACKUP`. Las claves se deduplican; si falta la principal en el entorno, se consulta el secreto existente en Vault.

Publica las cuatro funciones `nutrition-coach`, `parse-meal-text`, `analyze-meal` y `search-foods` con el import map `supabase/functions/deno.json`. No se necesitan cambios de base de datos para este reparto.

## Cuotas externas

Las cuotas efectivas dependen de cada cuenta, proyecto y modelo. Dos claves Gemini del **mismo proyecto comparten cuota**; agregar otra clave no garantiza aumentar capacidad. Los límites activos se consultan en [Google AI Studio](https://ai.google.dev/gemini-api/docs/rate-limits). Groq aplica límites por organización y modelo: revisa [Groq Limits](https://console.groq.com/docs/rate-limits), que pueden diferir de los valores generales publicados.

Esta integración no activa facturación, no contrata planes ni añade gateways de pago. El plan de la cuenta del proveedor determina si sus llamadas están dentro del nivel gratuito. La suscripción de ChatGPT no se utiliza para autenticar esta aplicación.

Ver [pruebas de publicación del 9 de octubre](ai-providers-release-2026-10-09.md).
La configuración, los límites y las plataformas de voz se describen en [coach por voz](coach-voice.md).
