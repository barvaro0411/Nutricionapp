# Coach animado y fiabilidad diaria — publicación del 9 de octubre de 2026

Disponible en [Coach IA](https://dist-two-alpha-18.vercel.app/coach). El frontend publicado incorpora una mascota animada que responde al estado del chat y de la voz, una bienvenida renovada y errores con reintento en pantalla. La mascota respeta movimiento reducido y detiene la animación fuera de la pantalla o en segundo plano.

## Consumo y recuperación

- Cada mensaje del coach tiene un UUID. Si la respuesta se pierde después de guardarse, reintentar el mismo texto recupera esa respuesta sin otra llamada a IA, sin duplicar los mensajes y sin otra reserva de cuota.
- La base guarda el mensaje y la respuesta en una transacción y protege consultas simultáneas. Los RPC de recuperación y las tablas internas son exclusivos del backend.
- Las funciones comparten los cooldowns por hash de credencial y modelo. Se respeta el tiempo de espera indicado por cada proveedor y se avanza al respaldo disponible. Una clave inválida no deshabilita las demás.
- Los respaldos comparten un plazo total; las traducciones del buscador utilizan caché acotada y deduplican trabajo concurrente. No se activó facturación ni respaldo de OpenAI.
- Se conservan 100 solicitudes por usuario al día y 10 por minuto. Los errores distinguen ambos límites e indican cuándo reintentar; el contador diario de la app se renueva a medianoche en Chile.

Las cuotas externas siguen dependiendo de las cuentas y modelos. Claves Gemini del mismo proyecto comparten cuota. La optimización reduce consumo y mejora la recuperación, pero no elimina esos límites.

## Destinos y versión

- Supabase existente: `ylirrvllpwghktugbdxh`; migración `20261009000000` aplicada y registrada en una transacción después de respaldar el RPC anterior.
- Cinco funciones publicadas: `analyze-meal`, `parse-meal-text`, `search-foods`, `nutrition-coach`, `coach-live-session`.
- Se agregó solo el secreto `AI_PROVIDER_HEALTH_SHARED=true`, conservando claves y configuración anteriores.
- Vercel existente `nutricionapp`: `dpl_E6y3Ce5x4RFLjtVJFZUVKofbDy5w`, preparado con `--prod --skip-domain`, probado y promovido.
- Fuente aislada: base publicada `5c53456` más los archivos propios del avance `e2d3fbe`. Se excluyeron los commits de limpieza y los cambios locales pendientes ajenos al coach/APIs.
- Bundle: `/_expo/static/js/web/entry-e6c3052ea80e900c5347e682187e1c57.js`, 2 576 022 bytes. SHA-256: `edf3e7004b6cc9bb073daa509e62409b83121111e7d6b5b860ed39b5a1f02d0d`.

## Evidencia

- Verificación local del avance: 220 pruebas en 30 suites, TypeScript del frontend, ESLint y tipos de cinco funciones Edge, todos correctos.
- Cinco comprobaciones reales de base: una sola generación ante solicitudes concurrentes; guardado atómico y recuperación; conflicto al reutilizar UUID con otro texto; tablas/RPC privados; cooldown compartido y tiempos de reinicio diario/minuto.
- Cinco flujos con proveedores reales: coach con 2000 kcal de meta y 195 kcal registradas; interpretación de texto con referencias USDA; búsqueda en español; dictado con Whisper y extracción; análisis de foto con Gemini.
- Diez comprobaciones de navegador: mensajes antiguos con formato; controles de lectura; animación; movimiento reducido; pérdida de respuesta y recuperación con el mismo UUID y contador sin incremento; respuesta correcta de 1805 kcal restantes; audio Gemini Live; liberación del micrófono; historial persistente; móvil/escritorio sin desbordamiento.
- Gemini Live devolvió 231 840 bytes de audio y guardó un turno completo. No hubo errores de página.
- No se encontraron claves privadas en la fuente ni el bundle. Las cuentas, la imagen y el registro sintéticos se eliminaron después de las verificaciones.

La conversación Gemini Live continúa disponible en la web/PWA. En plataformas donde no está soportada, permanecen el chat y la lectura con la voz del dispositivo.
