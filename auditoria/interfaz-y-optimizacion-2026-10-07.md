# Interfaz y rendimiento — 7 de octubre de 2026

La aplicación tiene una interfaz coherente en móvil y escritorio, con verde bosque, tonos claros, botones legibles y estados de carga, error y ausencia de registros. Se renovaron acceso, registro, recuperación de contraseña, panel diario, registro de comidas, progreso, perfil, recetas y asistente; las pantallas secundarias comparten anchos y espaciado.

## Mejoras funcionales

- Contraseñas visibles bajo elección del usuario, autocompletado y validación del formulario de registro; confirmación de correo con opción de reenvío.
- Navegación por días desde el historial, fecha conservada al registrar comidas y acceso para volver a hoy.
- Edición del nombre guardada en Supabase y exportación CSV con registros reales.
- Búsqueda de recetas sin depender de tildes, filtros y mensaje cuando no hay resultados.
- Mensajes de error con reintento; un fallo al cargar el panel no se presenta como un día vacío.
- Campos y controles accesibles, tamaños adaptables y formularios comprobados a 320, 390 y 1.440 px.
- Icono, pantalla de inicio y manifest PWA ajustados a la nueva identidad.

## Optimizaciones medidas

| Medida | Antes | Después |
| --- | --- | --- |
| JavaScript web sin comprimir | 4,13 MB | 2,54 MB, aproximadamente 38 % menos |
| Archivo web comprimido con gzip | — | Aproximadamente 666 KB |
| Paquete Android exportado | 7,19 MB | 5,37 MB, aproximadamente 25 % menos |

Se importan únicamente los iconos utilizados y los lectores de códigos de barras necesarios. El mapa de iconos se obtiene de las exportaciones del paquete instalado, preservando sus alias. La lectura web conserva EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 e ITF.

Las consultas de metas y comidas se inician en paralelo. Las consultas de pantallas aceptan cancelación al cambiar de día o salir. Los hooks que necesitan el usuario se suscriben a ese campo y evitan actualizaciones por cambios ajenos del perfil. Se retiró el ciclo duplicado de reintentos de React Query: Supabase mantiene sus reintentos para lecturas con fallos transitorios. Los recursos con nombre basado en su contenido tienen caché prolongada; el service worker y el manifest siguen comprobando actualizaciones.

Los tamaños son mediciones de compilación, no una garantía de tiempo de carga en todas las conexiones. La caché de consultas sigue separada por cuenta y se limpia al cambiar de sesión.

## Verificación

- TypeScript y ESLint sin errores ni advertencias.
- 83 pruebas aprobadas en 15 suites.
- Compilaciones web/PWA y Android correctas.
- 13 grupos de pruebas de navegador: formularios, confirmación, acceso, configuración inicial, consultas simultáneas con red retrasada, agua, lectura EAN-13 por cámara, guardado con fecha/unidad, historial, perfil, CSV, recetas, asistente y recuperación del panel tras un fallo de consulta.
- La cámara de navegador recibió un video controlado con un código válido; la detección y el flujo de la aplicación fueron reales. Open Food Facts recibió una respuesta controlada. Las consultas, el acceso y los guardados usaron el backend conectado. No se enviaron consultas nuevas al proveedor de IA en esta prueba.
- Cero errores JavaScript sin capturar. Las cuentas y sus datos de prueba se eliminaron al terminar.
- Los registros originales de las cinco tablas respaldadas se conservaron. No se incluyeron claves privadas en los archivos compilados ni en los archivos preparados para Git.

Capturas con una cuenta ficticia: [acceso](interfaz-2026-10-07/acceso-escritorio.png), [panel móvil](interfaz-2026-10-07/inicio-movil.png), [panel de escritorio](interfaz-2026-10-07/inicio-escritorio.png), [perfil](interfaz-2026-10-07/perfil-movil.png) y [recetas](interfaz-2026-10-07/recetas-movil.png).

La [auditoría de seguridad](seguridad-cuentas-2026-10-07.md) documenta aislamiento de cuentas y persistencia. Siguen pendientes la prueba en teléfonos físicos, la entrega a buzones reales y la verificación de respaldos/restauración. Las migraciones remotas anteriores ausentes se describen en el [informe de correcciones](correcciones-2026-10-07.md).

`npm audit` conserva avisos sin parche en herramientas de compilación; los tres paquetes de origen están ausentes del archivo web, comprobado mediante su mapa de fuentes. El detalle y las fuentes están en el informe de seguridad. Los mapas de fuentes usados para esta revisión permanecen en `artifacts`, fuera de Git y de Vercel.

## Publicación

Proyecto Vercel existente: `nutricionapp`, identificador `prj_xpMJ7iR8zkdkYGjWdZTa3yAfRAnD`. Dominio de producción asociado: https://dist-two-alpha-18.vercel.app. El despliegue se verifica antes de asignarle el dominio; el resultado de esa comprobación se registra al terminar la publicación.
