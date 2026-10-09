# Inicio y navegación — 9 de octubre de 2026

## Cambios

- Inicio ofrece un selector semanal con el día activo y acceso directo para añadir comida a la fecha elegida. Los botones anteriores de cambio de día siguen disponibles.
- El resumen de energía distingue consumo y calorías restantes. Las tarjetas de nutrientes muestran gramos registrados, metas y progreso con fondos suaves.
- Hidratación incorpora un vaso visual y botones amplios de 250 y 500 ml. Ambos guardan el agua en el día seleccionado.
- Las comidas tienen mayor separación, controles cómodos y una insignia para referencias USDA. El acceso a Progreso está junto al resumen de comidas.
- La cabecera incorpora un acceso al perfil. La navegación muestra iconos y etiquetas; en escritorio usa una barra centrada. Las tarjetas del coach y recetas se apilan cuando el espacio es reducido.
- Se aumentó el contraste de textos secundarios y del color de hidratación. Los selectores y progresos tienen nombres y valores accesibles.

## Alcance

Se utilizan los componentes, cálculos y proveedores existentes. Estas mejoras no añaden consultas de IA, dependencias ni migraciones. La fuente de publicación parte de la versión anterior publicada y contiene solamente los ocho archivos de interfaz de esta mejora. Se conservan separados los seis archivos de trabajo local previo.

## Verificación

Las comprobaciones de navegador recorren Inicio, cambio de fecha con teclado, guardado de agua, registro manual para un día anterior, perfil, Progreso y controles del coach. Usan una cuenta sintética de Supabase que se elimina al finalizar. El diseño se revisa a 320, 390, 768 y 1366 píxeles de ancho; estas comprobaciones corresponden a la versión web, no a dispositivos nativos físicos.

- TypeScript y ESLint correctos en el workspace; exportación PWA y TypeScript correctos en la fuente aislada de publicación.
- 247 pruebas correctas en 32 suites existentes. Esta mejora de interfaz no añade pruebas unitarias; el total incluye tres pruebas del trabajo local previo conservado.
- Ocho comprobaciones completas de navegador: energía, nutrientes y agua reales; selector semanal y teclado; guardado de agua por fecha; cuatro tamaños con etiquetas de navegación visibles y sin desbordamiento horizontal; perfil; registro manual con fecha anterior y actualización de Inicio; Progreso mensual; controles del coach y movimiento reducido.

## Publicación verificada

Disponible en [Nutrición IA](https://dist-two-alpha-18.vercel.app).

- Proyecto Vercel existente: `dpl_J36YZLVe73aqyZhHEdMc4w9daad7`. Se promovió el mismo build que pasó las comprobaciones, sin reconstruirlo.
- Bundle público y preparado iguales: `/_expo/static/js/web/entry-c6ae5442727361b2fb4a079f9157dddd.js`. SHA-256: `f91148f6c39fea20f7a255f63c2fabc42e2e99610baea9bdbc784f8b09baf939`.
- Dos comprobaciones adicionales en el dominio público: valores reales de energía, nutrientes y agua; selector semanal, acceso a alimentos y navegación al perfil. La cuenta sintética se eliminó.
- No se encontraron claves privadas en la fuente ni en el bundle. Las funciones `nutrition-coach` y `coach-live-session` rechazaron peticiones sin sesión con estado 401.
