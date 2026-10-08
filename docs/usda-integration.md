# Gemini y USDA FoodData Central

Gemini identifica los alimentos, su preparación y la cantidad en fotos, texto y audio.
Después, las funciones `analyze-meal` y `parse-meal-text` consultan USDA para referencias
revisadas y calculan calorías, proteínas, carbohidratos y grasas por la porción indicada.
La cantidad y la confianza de Gemini se conservan: USDA no verifica el peso del plato.

## Alcance de esta primera versión

- Once referencias SR Legacy verificadas: arroz blanco crudo/cocido, huevo duro,
  palta, plátano, zanahoria cruda, tomate crudo, papa hervida sin piel,
  lentejas hervidas y pechuga sin piel cruda/asada.
- Coincidencias completas con los nombres de `supabase/functions/_shared/usdaCatalog.ts`.
  Preparaciones ambiguas, mezclas, platos chilenos, líquidos, cantidades desconocidas
  e identificaciones con confianza inferior a 0,8 mantienen los nutrientes de IA.
- Las etiquetas nutricionales y los códigos de barras conservan sus valores propios.
- La revisión muestra “Nutrientes: USDA” cuando hay referencia; cambiar la preparación
  o la unidad elimina esa atribución. Cambiar los gramos conserva la referencia.
- El identificador FDC y la descripción están disponibles en la respuesta y el borrador.
  Esta versión no agrega campos al historial o favoritos de la base de datos.

No se selecciona automáticamente el primer resultado de búsqueda. Las referencias
se validan por ID, descripción y tipo de datos, y los nutrientes por ID y unidad.
Un nutriente ausente no se interpreta como cero. Los resultados se escalan desde 100 g.

## Configuración y activación

La clave se configura **solo como secreto de Supabase**, con nombre `USDA_API_KEY`.
Nunca agregarla a variables `EXPO_PUBLIC_*`, al repositorio o al bundle de Expo.
El archivo local `.env.usda.local` está excluido de Git.

```powershell
npx supabase secrets set --env-file .env.usda.local --project-ref <project-ref>
npx supabase functions deploy analyze-meal --project-ref <project-ref>
npx supabase functions deploy parse-meal-text --project-ref <project-ref>
```

Publicar también la app para mostrar la atribución en la pantalla de revisión.
No se necesitan migraciones ni nuevas dependencias. Sin clave, la app mantiene
el análisis existente.

## Caché y disponibilidad

Se agrupan los IDs necesarios en una solicitud `/foods`; las consultas concurrentes
del mismo proceso comparten la petición. Caché de 24 horas por instancia de Edge
Function, limitada al catálogo revisado. Esta caché no se comparte entre regiones
o procesos. Una petición tiene un timeout de 6 segundos; errores conservan la
estimación de IA. Un 429 suspende consultas durante una hora en esa instancia.
No se registran URLs con claves ni respuestas de error del proveedor.

## Verificación

```powershell
npm test -- --runInBand
npm run type-check
npm run lint
npm run build:pwa
```

Las pruebas cubren nutrientes/unidades, porciones, coincidencias, caché, concurrencia,
fallas de USDA, etiquetas y los tres flujos de entrada. Las consultas reales de USDA
se comprobaron con la clave local; las pruebas automáticas usan proveedores simulados.

La integración quedó activada el 8 de octubre de 2026 en Supabase y en
[la app publicada](https://dist-two-alpha-18.vercel.app). Se verificó desde el navegador
el análisis real de arroz cocido, huevo duro y palta, la atribución USDA, el cambio
de porción de 150 a 300 g de arroz (390 kcal) y el guardado de los totales.
Las cuentas de prueba se eliminaron al terminar y las sesiones se usaron solo en memoria.

Fuente: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central.
[Guía de API y licencia CC0](https://fdc.nal.usda.gov/api-guide/).
