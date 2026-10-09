# Navegación, coach y revisión de pantallas — 9 de octubre de 2026

## Cambios

- La barra tiene cinco controles con iconos y etiquetas alineados. Registrar usa un icono integrado; deja de flotar sobre la etiqueta. Se mantienen enlaces, selección, navegación con teclado y eventos de pestaña de React Navigation.
- Los botones tienen al menos 56 píxeles de alto en la barra. El área inferior respeta los márgenes seguros del dispositivo y utiliza la misma altura en la configuración de navegación.
- El coach distingue conversar por voz, escuchar una respuesta y enviar texto. El botón de voz muestra estado y duración; durante una sesión activa permite detenerla aunque aparezca un error de carga.
- La mascota y las cuatro sugerencias forman parte del contenido desplazable. El cuadro de escritura sigue disponible en pantallas de poca altura y admite mensajes largos sin invadir las pestañas.
- El acceso de regreso del coach dentro de las pestañas vuelve a Inicio; la pantalla independiente conserva el regreso normal.
- Informe, cámara y código de barras comparten un encabezado con botón de regreso de 44 píxeles, título separado y acceso de respaldo cuando se abren directamente. Las páginas respetan los márgenes seguros.
- El perfil muestra el correo en una línea separada que se puede seleccionar. Los botones de ajuste de metas son más amplios y tienen nombres distintos. Los controles de nutrientes se alinean de forma consistente.
- En la revisión de comida se ampliaron selectores, ajustes de porción y favoritos. El modal de texto/voz tiene pestañas y cierre de 44 píxeles, ancho máximo y desplazamiento para pantallas pequeñas.
- El informe distribuye sus valores en dos columnas y mantiene la descarga CSV. En recetas, los ingredientes largos se ajustan sin desplazar su cantidad; el botón de registro admite texto en varias líneas.

## Revisión y alcance

Se revisaron 19 vistas en anchos de 320, 390, 768 y 1366 píxeles: Inicio, Progreso, Añadir alimentos, Perfil, Coach, catálogo de recetas, detalle de receta, Informe, Cámara, Código de barras, Revisión manual, Perfil inicial, Metas, redirección de acceso beta, cambio de contraseña con sesión, Inicio de sesión, Registro, Recuperación y cambio de contraseña sin sesión. El coach y el modal también se comprobaron a 640 píxeles de altura.

Los cambios se limitan a doce archivos de interfaz. Se conserva la fuente publicada anterior y se excluyen los seis archivos de trabajo local previo. No se añaden dependencias, migraciones, proveedores ni llamadas de IA al cargar las pantallas.

## Verificación

- TypeScript, ESLint y exportación PWA correctos. La fuente aislada también pasa TypeScript.
- 247 pruebas correctas en 32 suites existentes; el total incluye tres pruebas de trabajo previo conservado.
- Ocho comprobaciones del diario: valores guardados, selector semanal, agua por fecha, cuatro tamaños, perfil, registro manual para un día anterior, Progreso mensual y controles del coach con movimiento reducido.
- Nueve comprobaciones de controles: etiquetas y teclado de pestañas; voz y escritura en pantallas bajas; sugerencia fallida con texto conservado y sin reintentos automáticos; respuesta del coach persistida; lectura y detención; borrador largo y regreso; modal de texto/voz; ajustes de metas; periodo y descarga CSV del informe.
- La respuesta real usada en la prueba es una pregunta exacta sobre calorías registradas y utiliza el cálculo de datos guardados, sin consultar un proveedor de IA. El fallo de red y la síntesis de voz se simulan para comprobar los controles; no se repite una llamada real a Gemini Live en esta revisión visual.
- Las cuentas sintéticas y sus registros se eliminan al terminar. Las comprobaciones corresponden a navegador web; no sustituyen pruebas en teléfonos nativos físicos.

## Publicación

Disponible en [Nutrición IA](https://dist-two-alpha-18.vercel.app).

- Build del proyecto Vercel existente: `dpl_JCQgdB7Cpsvpv2UffBTfNL1eRZFG`, probado antes de promover sin reconstruir.
- Las 19 vistas, sus 76 disposiciones y los 17 recorridos de diario y controles pasaron en la versión preparada. No se detectaron desbordamientos horizontales ni errores de página.
- Tres comprobaciones adicionales en el dominio público: valores reales del diario; acceso a alimentos y perfil; coach y barra de cinco pestañas. Se eliminó la cuenta sintética.
- Bundle público y preparado iguales: `/_expo/static/js/web/entry-bba303c4188644a43c6991d6014e5506.js`. SHA-256: `76be43cc1cec800d3f0f95814d1aacc29cf196023965dab3704afaea9f8c59db`.
- No se encontraron claves privadas en la fuente ni en el bundle. Las funciones del coach conservaron el rechazo de peticiones sin sesión con estado 401.
