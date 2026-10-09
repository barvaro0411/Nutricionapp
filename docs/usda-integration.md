# Gemini y USDA FoodData Central

Gemini identifica alimentos, preparación y cantidad en fotos, texto y audio. USDA aporta los nutrientes de una referencia compatible. El peso sigue siendo una estimación que el usuario debe revisar.

## Búsqueda automática y manual

- La búsqueda general consulta Foundation, SR Legacy y Survey (FNDDS). Las once referencias revisadas originalmente se conservan como acceso rápido, sin limitar el resto de alimentos.
- Gemini genera términos en inglés y puede proponer una segunda formulación. Un paso de selección compara ingredientes, cocción, corte, piel y contenido de grasa/azúcar. Solo se aceptan IDs presentes en los resultados, con confianza de equivalencia de al menos 0,85 y controles adicionales de crudo/cocido/frito y con/sin piel.
- No se usa automáticamente el primer resultado. Los datos completos se validan por ID, descripción, tipo de datos, identificadores de nutrientes y unidades. Un nutriente ausente no se convierte en cero. Se admite energía Atwater de Foundation (2047/2048), además de 1008.
- Fideos cocidos y salsa con carne se consultan por separado. Una salsa no debe usar los nutrientes de un plato de pasta completo ni de carne acompañada de salsa. El servidor rechaza esas combinaciones aunque el modelo les asigne confianza alta. Preparaciones locales o ingredientes inciertos conservan la estimación si no hay referencia suficientemente compatible.
- Para una búsqueda explícita de salsa de tomate con carne, tanto el análisis como el buscador añaden el término indexado `spaghetti sauce with meat`. Se conserva una formulación adicional y se excluyen platos completos y salsas sin carne. Una búsqueda «sin carne» conserva esa restricción.
- En la revisión, **Agregar desde USDA** permite buscar en español y elegir un alimento; **Buscar nutrientes en USDA / Cambiar referencia USDA** permite corregir uno existente. Se muestran nombre en español, descripción original, nutrientes por 100 g/ml y porción editable.
- Los líquidos requieren una porción pesada de USDA para derivar gramos por ml. Se usan medidas explícitas en ml o equivalencias domésticas documentadas por USDA (taza: 237 ml). No se supone que todos los líquidos pesen 1 g/ml. Si falta esa información, se puede buscar en gramos o conservar la estimación.
- Etiquetas nutricionales y productos de código de barras conservan sus datos propios; la búsqueda automática utiliza referencias genéricas, sin sustituir productos de marca.

## Historial y favoritas

La migración `20261008000000_usda_complete.sql` agrega `nutrition_reference` a `meal_items` y `favorite_meal_items`, valida su formato y actualiza `save_meal` y `save_favorite`. Los registros existentes quedan sin referencia, sin recalcular sus nutrientes.

La referencia contiene fuente, ID FDC, descripción y, cuando corresponde, tipo de datos y base de 100 g/ml. El historial muestra USDA; las favoritas conservan la referencia al reutilizarlas. Cambiar la cantidad mantiene y escala los nutrientes; cambiar la preparación o unidad elimina la atribución anterior. Seleccionar otra referencia reconstruye los ratios para la nueva porción.

## Configuración y publicación

La clave se configura **solo como secreto de Supabase**, con nombre `USDA_API_KEY`. Nunca usar `EXPO_PUBLIC_USDA_API_KEY` ni incluir claves en Git. `.env.usda.local` está excluido de Git.

Aplicar primero la migración incremental al proyecto existente; `bootstrap.sql` y `full_schema.sql` son solo para instalaciones nuevas. Después:

```powershell
npx supabase secrets set --env-file .env.usda.local --project-ref <project-ref>
npx supabase functions deploy analyze-meal --project-ref <project-ref>
npx supabase functions deploy parse-meal-text --project-ref <project-ref>
npx supabase functions deploy search-foods --project-ref <project-ref>
npm run build:pwa
```

Publicar el frontend en Vercel. La clave USDA no se necesita en Vercel porque las llamadas se realizan desde Supabase. `search-foods` verifica el token mediante `auth.getUser` y reserva la cuota existente antes de llamar a los proveedores.

## Disponibilidad y límites

Cada consulta USDA tiene un timeout de seis segundos. Los detalles se agrupan en lotes de hasta veinte IDs. Búsquedas idénticas comparten solicitudes concurrentes y una caché de 24 horas, limitada a 300 entradas por instancia. La caché no se comparte entre procesos ni regiones. Los errores se conservan brevemente; un 429 suspende consultas por una hora en esa instancia.

Los detalles completos tienen además una caché de hasta 300 referencias validadas por ID durante 24 horas. Un nuevo lote solicita únicamente los IDs faltantes; lotes distintos comparten las referencias en curso. Cada consumidor recibe una copia de los nutrientes para evitar modificar la caché al editar porciones. Las referencias incompletas o vencidas no se reutilizan como datos válidos. Las porciones y los totales de foto/texto/audio utilizan las mismas funciones de cálculo; se conserva la energía proporcionada por la fuente, sin reconstruirla desde macronutrientes redondeados.

El enriquecimiento automático procesa hasta veinte alimentos fuera del acceso rápido por análisis, con hasta dos búsquedas por alimento y concurrencia acotada. Alterna los resultados de ambas búsquedas, elimina duplicados y preparaciones incompatibles, y envía como máximo seis candidatos por alimento a Gemini. El prompt solo incluye ID y descripción del candidato; los datos completos se validan después. Esto reduce el consumo de la cuota de tokens de entrada sin elegir automáticamente el primer resultado. Los demás alimentos conservan su estimación y pueden consultarse manualmente. La búsqueda manual muestra hasta doce resultados completos.

La selección adicional tiene un plazo total de doce segundos, compartido entre claves de respaldo y reintentos. La traducción opcional de las etiquetas del buscador tiene ocho segundos; si falla, se conserva la descripción original de USDA. El análisis inicial comparte un plazo total entre proveedores y claves de respaldo. Las cuotas externas siguen pudiendo limitar las solicitudes y no se reintenta inmediatamente un 429 con la misma clave. El estado de espera se comparte entre funciones cuando está habilitado `AI_PROVIDER_HEALTH_SHARED`.

Si USDA o la selección adicional no están disponibles, el análisis inicial sigue disponible para revisión. El buscador muestra un error recuperable o explica que no hay resultados completos. Nunca se registran URLs con claves ni cuerpos de errores del proveedor.

## Verificación

```powershell
npm test -- --runInBand
npm run type-check
npm run lint
npm run build:pwa
```

Las pruebas cubren nutrientes, porciones, selección de IDs, incompatibilidades de cocción, densidad, caché, concurrencia, errores, autenticación, cuota, etiquetas y los tres flujos de entrada. La prueba de publicación usa proveedores reales, una cuenta temporal con sesión solo en memoria y eliminación al terminar; verifica además persistencia, favoritas e idempotencia.

Fuentes: [guía de API de USDA](https://fdc.nal.usda.gov/api-guide/), [Foundation Foods y energía Atwater](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/), [equivalencias de volumen, USDA HG72, tabla 1](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/hg72/hg72_2002.pdf). Datos de USDA FoodData Central, Agricultural Research Service, de dominio público (CC0).
