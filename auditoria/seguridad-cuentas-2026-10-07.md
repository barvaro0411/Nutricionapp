# Seguridad de datos y registro de cuentas — 7 de octubre de 2026

La revisión del backend conectado y las pruebas con dos cuentas temporales confirmaron aislamiento entre usuarios y persistencia después de cerrar sesión. Esto comprueba los accesos y flujos indicados abajo; no constituye una garantía de seguridad absoluta ni una prueba de recuperación ante desastres.

## Comprobaciones

- Las 21 tablas públicas tienen RLS habilitado. Las políticas de información personal restringen las filas al identificador autenticado; recetas y productos verificados son catálogos compartidos.
- Las dos vistas de totales usan `security_invoker=true`, por lo que respetan los permisos del usuario que consulta.
- El bucket `meal_photos` es privado, limita los archivos a 5 MB y acepta JPG, PNG y WebP. Las políticas restringen subida, lectura y eliminación a la carpeta del usuario.
- La cuenta anónima y los usuarios normales no tienen acceso al esquema privado de auditoría. Las funciones de secretos, cuotas y mantenimiento no conceden ejecución a esos roles.
- El frontend utiliza la clave pública de Supabase. El escaneo de 58 archivos compilados web/Android no encontró los valores de claves administrativas o de IA presentes en las variables locales. No hay archivos de variables privadas rastreados por Git.
- El registro está habilitado y requiere confirmar el correo. El trigger de creación de usuarios está activo y crea perfil y suscripción gratuita.
- No hay usuarios de Auth sin perfil, perfiles sin usuario, perfiles sin suscripción, perfiles completos sin metas activas ni usuarios con varias metas activas.

## Prueba real de cuentas

Se generaron dos registros y sus enlaces de confirmación mediante la API administrativa, sin enviar correos. La confirmación, el inicio de sesión, las consultas y los guardados se ejecutaron con clientes normales contra Supabase. Se verificó que una cuenta sin confirmar no podía iniciar sesión.

1. El registro creó el nombre del perfil y la suscripción gratuita antes de la confirmación.
2. La configuración inicial guardó medidas y metas. Una petición con metas inválidas no modificó parcialmente el perfil ni creó una segunda meta activa.
3. Las cuentas ajenas y anónimas no pudieron consultar los registros de prueba en 14 tablas/vistas: perfiles, metas, comidas, ítems, favoritas, ítems favoritos, agua, pesos, mensajes, actividad, suscripciones, planes personales y vistas de totales.
4. La segunda cuenta no pudo insertar datos atribuidos a la primera, modificar su perfil ni eliminar o actualizar su comida mediante acceso directo o RPC.
5. Un usuario normal no pudo darse una suscripción pagada ni ejecutar el consumo de cuota reservado al backend. Una petición anónima de configuración inicial fue rechazada.
6. La segunda cuenta no pudo descargar, firmar, subir o borrar fotos de la primera. La ruta pública no permitió acceder al archivo. El dueño sí pudo descargarlo y generar un enlace temporal.
7. La función de IA respondió 403 ante una foto ajena y 401 sin una sesión válida, antes de analizar la imagen.
8. Después de cerrar sesión y entrar con un cliente nuevo, el perfil, el peso, las metas, la comida y la foto siguieron disponibles.

Los ocho grupos de comprobaciones pasaron. Las dos cuentas, las fotos y los datos temporales se eliminaron. La comparación posterior volvió a confirmar que se conservaron los registros originales de las cinco tablas verificadas en la corrección anterior.

## Qué se guarda y cuándo

Al registrarse se crean la identidad, el perfil básico y la suscripción gratuita. Las medidas corporales y metas se guardan al completar la configuración inicial. Después, cada comida o registro confirmado se guarda en Supabase asociado a esa cuenta. Cerrar sesión no elimina esos registros.

Los campos que todavía se están escribiendo o un borrador sin confirmar no equivalen a datos guardados. Las fotos están sujetas al mantenimiento y retención del backend, por lo que no debe prometerse conservación indefinida de imágenes.

## Límites

La auditoría de dependencias `npm audit --omit=dev` devuelve **38 avisos (32 altos y 6 moderados)** que se propagan desde tres paquetes de herramientas de compilación: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) y [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Los avisos consultados no ofrecen versiones corregidas. El mapa de fuentes del archivo web publicado confirma que estos tres paquetes no forman parte de la aplicación que recibe el navegador; Vercel sirve archivos estáticos y no un servidor Expo de desarrollo. Sigue pendiente resolver los avisos en las herramientas cuando existan correcciones compatibles. La sugerencia automática de npm fuerza cambios incompatibles de Expo/React Native, por lo que no se aplicó.

No se verificaron la configuración de respaldos automáticos, el plan de retención de respaldos ni una restauración real de la base. Tampoco se realizó una prueba de penetración completa o se evaluó cada configuración de infraestructura. La entrega de correos de confirmación a un buzón real no se probó; las pruebas usaron enlaces generados sin envío.

Los administradores y el backend autorizado conservan acceso de servicio. Los enlaces firmados permiten acceso temporal a quien posea el enlace. El estado de publicación del frontend se registra en el [informe de interfaz y optimización](interfaz-y-optimizacion-2026-10-07.md).

Scripts de solo lectura: [metadatos](seguridad-cuentas-2026-10-07.cjs), [consulta SQL](seguridad-cuentas-2026-10-07.sql). Las evidencias y utilidades con acceso administrativo están en carpetas ignoradas por Git.
