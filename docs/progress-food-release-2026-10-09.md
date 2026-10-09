# Progreso y registro de alimentos — 9 de octubre de 2026

## Pantallas

- Progreso permite elegir los últimos 7 o 30 días, alternar energía, proteína, carbohidratos y grasas, tocar una barra para consultar un día y ampliar el listado mensual. La vista mensual comienza por los días recientes.
- El resumen muestra días con registros y comidas guardadas. Los promedios incluyen solo días con comidas y aclaran que puede haber registros parciales. La línea del gráfico identifica la meta de hoy; no afirma que sea la meta histórica de cada día ni clasifica registros incompletos como cumplimiento.
- Añadir alimentos destaca la búsqueda USDA y permite ingresar directamente una etiqueta nutricional. Conserva foto, texto/voz, código de barras y favoritos, con la fecha y el horario elegidos visibles.
- La búsqueda separa elegir la referencia de ajustar la porción. Muestra calorías y macronutrientes calculados antes de añadir, con atajos de cantidad. Rechaza cantidades inválidas y cambios de unidad sin conversión verificada.
- El ingreso manual comienza con nutrientes vacíos. Explica que los datos corresponden a la cantidad indicada; después se puede ajustar la porción proporcionalmente. El guardado vuelve al día registrado y refresca los resúmenes en paralelo.
- Los favoritos abiertos desde Registrar respetan el horario elegido. El acceso general de Inicio conserva el horario original de la favorita.

## Datos y consumo

Los periodos usan fechas del calendario chileno y sumas guardadas en `v_daily_totals`. Una consulta obtiene el periodo completo; se reutiliza la caché de TanStack Query por usuario, periodo y día. Cambiar de nutriente o seleccionar una barra no utiliza IA ni vuelve a consultar la base.

No se agregaron dependencias, proveedores de pago, migraciones ni secretos. Se conservaron el backend optimizado, el coach animado y sus controles de texto y voz. Los cambios locales previos de cálculo, mensajes de error y guía de porciones se mantuvieron fuera de esta publicación y del commit.

## Verificación

- 247 pruebas en 32 suites correctas en el workspace, incluyendo cinco pruebas nuevas de periodos, horario chileno, cambio de hora, días vacíos, promedios y valores inválidos. Tres pruebas pertenecen al trabajo local previo conservado.
- TypeScript, ESLint y exportación PWA correctos. También se verificaron los tipos de la fuente aislada que se publica.
- Once comprobaciones de navegador sobre una cuenta sintética: estado vacío; textos de un día registrado; periodo semanal; periodo mensual y nutrientes; apertura del día elegido; ingreso manual con nutrientes vacíos, escalado y fecha anterior; selección USDA, unidades inválidas y referencia persistida; actualización de Progreso; favoritos con horario y fecha elegidos; controles del coach; móvil y escritorio sin desbordamiento ni errores de página.
- Las pruebas consultan Supabase y USDA reales y eliminan la cuenta sintética con sus registros al terminar.

La publicación utiliza el proyecto Vercel existente y una copia aislada de la última fuente de frontend publicada más los archivos de esta mejora. Se prueba antes de promover el mismo build al dominio público.

## Publicaci?n verificada

Disponible en [Progreso](https://dist-two-alpha-18.vercel.app/history) y [A?adir alimentos](https://dist-two-alpha-18.vercel.app/record).

- Vercel existente: `dpl_13nEvEzgq78ckdDZFDnBue9D9deJ`, probado antes de promover sin reconstruir.
- Bundle p?blico y preparado iguales: `/_expo/static/js/web/entry-c56177c53f6813559f367a46aa6010ec.js`. SHA-256: `2514a7f0dc7fba34e5002cf175830e7c2da10845dc8871a429797378d7613549`.
- Tres comprobaciones adicionales en el dominio p?blico: Progreso con datos reales y cambio de periodo; accesos de b?squeda e ingreso manual; controles del coach. La cuenta sint?tica se elimin?.
- No se encontraron claves privadas en fuente ni bundle. Las funciones del coach devolvieron 401 sin sesi?n.
