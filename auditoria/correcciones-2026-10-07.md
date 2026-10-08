# Correcciones y verificaciones — 7 de octubre de 2026

Se corrigieron los siete bugs identificados en la [revisión inicial](revision-2026-10-07.md), la referencia a una foto inexistente y un desbordamiento del control de porciones en pantallas pequeñas. Las migraciones de Supabase y la función `analyze-meal` están aplicadas en el proyecto conectado. La renovación visual y el estado de publicación se documentan en el [informe de interfaz y optimización](interfaz-y-optimizacion-2026-10-07.md).

## Cambios

| Problema | Corrección |
| --- | --- |
| Comidas y favoritas perdían `ml` | Se aplicó `20261007000000_liquid_units.sql`: los RPC de guardado conservan la unidad recibida y mantienen `g` para clientes antiguos. |
| Una comida seleccionada para ayer se guardaba hoy | La ruta transmite la fecha elegida y cada método de registro la conserva al reiniciar el borrador. Se muestra la fecha y una opción para cambiar a hoy. |
| Analizar un producto reemplazaba el borrador y duplicaba el alimento | El análisis de productos y etiquetas usa una modalidad sin modificar el borrador. El alimento se agrega una sola vez al confirmar la porción. |
| Nutrientes de una porción se interpretaban como valores por 100 | La conversión usa la cantidad de referencia devuelta por IA. Se rechazan cantidades inválidas y densidades nutricionales imposibles. Las etiquetas tienen un modo explícito que distingue valores por porción y por 100 g/ml. |
| La caché cambiaba una botella de 1 litro a 100 ml | La caché conserva la porción, la unidad, el tamaño del envase y el texto de cantidad. Se aplicó `20261007000001_barcode_portions.sql`. |
| El escáner nativo quedaba cargando | Se agregó una implementación con `expo-camera`, solicitud de permisos, acceso a ajustes, manejo de errores y bloqueo de lecturas repetidas. El escáner web mantiene estable la cámara al cambiar los callbacks. |
| Los recordatorios nativos desaparecían al abrir la app | Se restauran según las preferencias de la cuenta y los permisos existentes. Los cambios de cuenta se sincronizan en orden; salir elimina únicamente los recordatorios de comidas. Un fallo al programar no guarda el recordatorio como activado. |
| El ajuste de porciones se salía de la pantalla | El campo tiene un ancho limitado y el contenedor se adapta. Se añadieron etiquetas accesibles al campo y a los botones. |

También se corrigieron dependencias y cancelación de animaciones en los avisos, se invalida la racha al registrar una favorita y se eliminan las fotos temporales de productos o análisis fallidos. Se retiró el borrado automático de fotos antiguas desde el cliente; la retención queda a cargo del mantenimiento del backend, que contempla las referencias de los registros.

## Base de datos y datos existentes

Antes de cambiar Supabase se respaldaron las tablas afectadas, las definiciones de los RPC y la función desplegada, en la carpeta local ignorada por Git `supabase/.private`. Se aplicaron únicamente las dos migraciones pendientes de esta corrección y se registraron en el historial remoto. No se ejecutó el esquema completo sobre la base existente.

La única referencia a una foto faltante no tenía un archivo recuperable en los respaldos disponibles. Se quitó esa referencia rota de la comida y se conservó la ruta anterior en el respaldo y en el registro privado de auditoría. No se recuperó la foto ni se eliminó la comida.

La comprobación posterior comparó los registros originales de `meals`, `meal_items`, `favorite_meals`, `favorite_meal_items` y `barcode_products`: se conservaron sus identificadores, cantidades de filas y demás campos, exceptuando la referencia de foto reparada y su fecha de actualización. Las consultas de integridad no encontraron diferencias entre los totales y sus ítems, tablas públicas sin RLS ni referencias restantes a fotos inexistentes.

## Verificación

- **83 pruebas aprobadas en 15 suites**: incluyen normalización nutricional, conservación de fecha, análisis de productos sin efectos en el borrador, caché, restauración de recordatorios y lectura de etiquetas.
- TypeScript y ESLint: sin errores; ESLint sin advertencias.
- Compilación web/PWA y exportación Android: correctas.
- El [script de regresión](revision-2026-10-07-reproducciones.cjs) ejecuta los handlers y el estado reales para confirmar fecha conservada, borrador sin duplicación, calorías correctas y caché estable.
- La [prueba SQL](verificar-guardado-2026-10-07.sql) invocó los RPC desplegados como usuario autenticado: comprobó `ml` en comidas y favoritas, compatibilidad con `g`, fecha, totales, guardado idempotente y rechazo de entradas inválidas. La transacción terminó con `ROLLBACK`.
- En un navegador de 390 px, con una cuenta temporal real, se registró una comida para el día anterior mediante un código de barras. Supabase recibió una comida con un ítem de **250 ml y 110 kcal**, en la fecha seleccionada; la caché conservó **1.000 ml**. La respuesta de Open Food Facts fue una muestra controlada para hacer reproducible la prueba; autenticación, consultas y guardado usaron el backend conectado.
- A 320 px, el campo y ambos botones permanecen dentro de la pantalla. Los botones cambian de 250 a 300 ml y recalculan 110 a 132 kcal; al disminuir, restauran 250 ml y 110 kcal. No hubo errores JavaScript sin capturar. [Captura de la interfaz corregida](correcciones-mobile.png).
- Se envió una etiqueta de prueba al `analyze-meal` desplegado, usando el proveedor de IA real. El resultado conservó `ml` y correspondió a **44 kcal y 11 g de carbohidratos por 100 ml**.

Las cuentas temporales, sus comidas, fotos y productos de prueba se eliminaron al terminar. Se volvió a comprobar la conservación de los datos originales después de la limpieza.

## Límites y estado de publicación

La cámara y las notificaciones nativas se comprobaron mediante código, pruebas y compilación Android; falta probarlas en dispositivos iOS y Android físicos. La respuesta correcta de IA sobre la etiqueta usada no garantiza precisión para todas las fotografías.

El historial remoto contiene tres migraciones anteriores cuyos archivos siguen ausentes del repositorio: `20261004000001`, `20261004000002` y `20261006000000`. Se preservó ese historial. Antes de reconstruir desde cero o ejecutar un despliegue general de migraciones debe recuperarse el código original de esos cambios.

El backend conectado ya incluye las correcciones. El [informe de interfaz y optimización](interfaz-y-optimizacion-2026-10-07.md) registra la compilación final y la publicación del frontend.
