# Diario de comidas — 9 de octubre de 2026

## Diseño

Inicio adopta el estilo de la referencia compartida: tarjetas blancas con bordes suaves, verde menta, resumen compacto y botones amplios. Las comidas aparecen antes de las herramientas de registro, hidratación y coach.

- «Tus comidas» muestra la cantidad real de registros y un acceso a Progreso.
- El selector de fecha ocupa una fila. Al tocar la fecha se despliegan los siete días; se mantienen las flechas y «Volver a hoy».
- El resumen reúne calorías consumidas, meta, porcentaje y nutrientes. En escritorio distribuye energía y nutrientes en una misma fila.
- Desayuno y Almuerzo empiezan abiertos. Once / Cena y Colación empiezan cerrados cuando tienen registros. Las categorías vacías presentan directamente «Añadir alimento».
- Los encabezados se pueden abrir y cerrar con teclado y anuncian su estado. Los botones de añadir tienen al menos 48 píxeles de alto y conservan tipo de comida y fecha.
- Los nombres largos se muestran completos. Cada alimento conserva su cantidad en gramos o mililitros, sus calorías y su referencia USDA cuando existe.
- La foto guardada pertenece a la comida completa y aparece con esa etiqueta. Los ingredientes usan un icono neutro; no se les atribuye una fotografía que no existe.
- La pestaña Registrar usa un botón circular. Las cinco etiquetas y sus áreas de interacción quedan alineadas.

## Datos y consultas

Los totales se calculan a partir de todos los registros del día, incluidas las comidas plegadas. El anillo muestra lo consumido; el porcentaje puede superar 100 %, mientras que la representación gráfica se limita a su recorrido. Se muestra explícitamente cuánto queda disponible o cuánto supera la meta.

El presupuesto conserva las calorías de actividad: meta diaria más actividad registrada. Los nutrientes mantienen sus valores reales aunque superen su meta. Una meta cero no produce divisiones inválidas.

Las fotos usan el bucket privado existente y una URL firmada por una hora. La consulta se limita a rutas del usuario autenticado, se comparte mediante TanStack Query y se mantiene fresca durante 30 minutos. Se solicita al abrir una comida con foto. Un error de imagen permite seguir usando el diario; no hay reintentos automáticos de firma.

Se modifican cuatro archivos de interfaz. No se agregan dependencias, migraciones ni proveedores de IA. La publicación parte de la fuente anterior y excluye los seis archivos de trabajo local previo.

## Verificación

- TypeScript, ESLint y exportación PWA correctos; la fuente aislada también pasa TypeScript.
- 247 pruebas existentes correctas en 32 suites. El total incluye tres pruebas del trabajo local previo conservado.
- Ocho comprobaciones específicas: comidas plegadas y totales; nombres completos y mililitros; foto privada cargada y firma reutilizada; tamaños de pantalla y botones; selector de fecha con teclado; añadir según tipo y fecha; exceso sobre la meta; actividad y presupuesto persistido.
- La cuenta sintética registra 212 + 917 + 406 = 1535 kcal y 81 g de proteína, 167 g de carbohidratos y 61 g de grasa. La cena permanece plegada y el resumen indica 77 % de 2000 kcal. Una porción extra lleva el total a 2135 kcal; al registrar 350 kcal de actividad quedan 215 kcal disponibles sobre un presupuesto de 2350 kcal.
- Ocho recorridos del diario verifican agua por fecha, registro manual para un día anterior, perfil, Progreso mensual y acceso al coach.
- Nueve comprobaciones adicionales cubren pestañas y teclado; voz y escritura del coach en pantallas bajas; fallo sin reintentos y con mensaje conservado; respuesta con datos guardados; lectura y detención; borrador largo; modal de texto/voz; ajuste de metas; descarga CSV.
- Se revisan anchos de 320, 390, 768 y 1366 píxeles. El coach y el modal también se comprueban a 640 píxeles de alto.

Las cuentas, registros y la imagen sintética se eliminan al finalizar. Las pruebas de voz de los controles usan síntesis simulada; la respuesta de texto real consulta un dato guardado y no llama a un proveedor de IA. Estas comprobaciones de navegador no sustituyen una prueba en un teléfono nativo físico.

## Publicación

La exportación local está terminada y pasa los 25 recorridos de navegador. La revisión automática de permisos rechazó la subida a Vercel por falta de autorización explícita para ese destino y evidencia de propiedad. Se solicitó autorización para publicar en el sitio existente y guardar el cambio en GitHub; el dominio público conserva la versión anterior.

Antes de promover, se deben repetir los recorridos sobre el build preparado de Vercel, publicar ese mismo build y verificar su igualdad con el bundle del dominio público.
