# Publicación de proveedores IA — 9 de octubre de 2026

Se publicó el reparto entre Groq, Gemini y USDA en el Supabase existente `ylirrvllpwghktugbdxh`. La app pública conserva su dirección: [Nutrición IA](https://dist-two-alpha-18.vercel.app).

El coach utiliza GPT-OSS 120B **en Groq**; texto y selección/traducción USDA utilizan GPT-OSS 20B. Whisper transcribe el dictado y el extractor interpreta alimentos y porciones. Gemini atiende fotos y etiquetas, con Qwen de Groq como respaldo; también respalda el coach y texto. [Configuración, plazos y cuotas](ai-providers.md).

## Configuración publicada

- Se agregaron y verificaron mediante sus nombres y hashes los secretos `GROQ_API_KEY`, `GROQ_COACH_MODEL`, `GROQ_TEXT_MODEL`, `GROQ_VISION_MODEL`, `GROQ_AUDIO_MODEL` y `GEMINI_API_KEY_ADDITIONAL`. Las claves anteriores de Gemini conservan su configuración.
- Funciones publicadas: `analyze-meal`, `parse-meal-text`, `search-foods` y `nutrition-coach`.
- OpenAI quedó fuera de los handlers activos. No se guardó ni configuró la clave OpenAI entregada durante la conversación. Una variable anterior o un selector legado `provider: "openai"` no activa llamadas de pago.
- Se respaldaron tres funciones desde el servidor. La CLI rechazó extraer el coach por su importación legítima `source/src/utils/dates.ts`, fuera de la carpeta de funciones. Se conservó su código original y dependencias desde el commit revisado `16703c2ad184258e468574812a26e1562f913866`, dentro del directorio de respaldo acotado. Ese respaldo es la base de Git, no una descarga exacta del coach remoto.
- No se aplicaron migraciones ni se publicó una nueva versión del frontend; el cliente existente pasó las pruebas con las funciones nuevas.

## Evidencia

| Comprobación | Resultado |
| --- | --- |
| Jest | 180 pruebas aprobadas, 24 suites |
| TypeScript frontend | Sin errores |
| TypeScript de las cuatro funciones Edge | Sin errores |
| ESLint y `git diff --check` | Sin errores |
| Claves nuevas en archivos publicables | Ausentes; archivos locales ignorados por Git |
| Handlers locales con proveedores y Supabase reales | Siete comprobaciones aprobadas |
| API publicada | Cinco comprobaciones aprobadas |
| Navegador móvil en dominio público, 390 × 844 | Cinco comprobaciones aprobadas; sin errores JavaScript |
| Cuentas y fotos temporales | Eliminadas al terminar |

Los handlers locales comprobaron contexto y persistencia del coach; fideos y salsa con referencias USDA separadas; búsqueda en español; audio WAV sintético con manzana de 150 g y leche de 250 ml; foto real de ensalada y jugo; inferencia directa del respaldo visual Groq; e inferencia con la clave Google adicional. La prueba local reprodujo un 401 de una clave anterior y confirmó que el respaldo puede responder. El prompt visual largo obtuvo un 429 por tamaño; el compacto respondió correctamente con la misma clave Groq.

La API publicada confirmó el modelo Groq del coach, el modelo Groq de texto, Whisper y el extractor para audio, Gemini para foto y la búsqueda USDA. En esa ejecución: coach 1.221 ms; texto 3.239 ms; audio 4.549 ms; foto 9.981 ms. Son tiempos observados, no garantías de latencia.

El navegador envió una consulta al coach con una comida previa de 195 kcal y meta de 2.000: la respuesta incluyó contexto de 1.805 kcal restantes y se guardaron ambos mensajes. Una recarga recuperó la respuesta y una segunda pregunta conservó el historial. Después interpretó manzana y leche mediante Groq, mostró cantidades en la revisión y guardó nutrientes, unidades y referencias en la base de datos.

Las pruebas automatizadas cubren rechazo de acceso anónimo, cuota interna, errores de proveedores sin conversaciones parciales, respaldo ante 429 o JSON inválido, independencia de modelos del coach/texto, plazos compartidos entre claves, multipart de audio, traducción paralela con detalles USDA y ausencia de llamadas OpenAI incluso con una clave y selector anteriores.

Los respaldos, capturas, audio sintético y evidencias detalladas permanecen en `supabase/.private/`, excluido de Git. Las sesiones de prueba se usaron únicamente en memoria.

## Límites

No se probó cámara o micrófono en un dispositivo físico; se verificaron una foto de prueba y audio sintético contra las APIs reales. Las porciones y alimentos ambiguos pueden conservar estimaciones sin referencia USDA; la prueba publicada de leche fue uno de esos casos. Cada proveedor sigue imponiendo sus cuotas. Las claves Google del mismo proyecto las comparten, y los cooldowns/cachés de la app solo viven dentro de instancias Edge activas.
