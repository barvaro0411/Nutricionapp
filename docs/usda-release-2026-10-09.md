# Verificación de publicación USDA — 9 de octubre de 2026

Se retomó `codex/usda-complete` desde el commit `3bc329a`. La integración ampliada está publicada en [Nutrición IA](https://dist-two-alpha-18.vercel.app).

## Correcciones

- La reproducción local, con la misma clave de producción verificada mediante hash, devolvió `RESOURCE_EXHAUSTED` para `GenerateContentInputTokensPerModelPerMinute-FreeTier`. Se redujo la selección a seis candidatos por alimento y solo ID/descripción. Se alternan ambas búsquedas antes de deduplicar y filtrar; la selección mantiene el umbral de equivalencia y valida los detalles de USDA.
- Se corrigieron ejemplos contradictorios de salsa y se añadió el término indexado `spaghetti sauce with meat` cuando la búsqueda pide explícitamente salsa de tomate con carne. El buscador manual aplica también esta corrección y los controles de preparación.
- Una salsa separada no acepta referencias de pasta completa ni de carne acompañada de salsa, aunque Gemini les asigne confianza alta. Se respetan búsquedas sin carne y referencias con/sin piel.
- La selección opcional tiene doce segundos totales entre claves/reintentos; la traducción de etiquetas tiene ocho. Los fallos conservan las referencias ya verificadas y las estimaciones restantes.

## Evidencia

| Comprobación | Resultado |
| --- | --- |
| Jest | 150 pruebas aprobadas en 22 suites |
| TypeScript frontend | Sin errores |
| TypeScript de las tres funciones Edge | Sin errores |
| ESLint | Sin errores ni advertencias |
| Exportación PWA | Correcta |
| Clave USDA en fuentes publicables y bundle | Ausente; archivo local excluido de Git |
| API real: fideos, salsa, manzana y leche | Cuatro referencias USDA; 7.142 ms en la prueba final |
| Fideos | `Pasta, cooked`, FDC 2708357 |
| Salsa separada | `Spaghetti sauce with meat`, FDC 2706470 |
| Leche | `Milk, whole`, FDC 2705385; nutrientes por 100 ml mediante porción pesada |
| Búsqueda manual en español | Salsa correcta y referencias con conversión verificable a ml |
| Persistencia e idempotencia | Comidas y favoritas conservan referencia; repetir el guardado devuelve la misma comida |
| Reutilización de favoritas | Conserva nutrientes y procedencia |
| Datos inválidos y acceso anónimo | Rechazados |
| Navegador móvil 390 × 844, versión preparada | Seis comprobaciones aprobadas; sin errores de JavaScript |
| Navegador móvil, dominio público | Mismo recorrido completo aprobado después de promover |
| Cuentas temporales | Eliminadas al terminar todas las pruebas |

El recorrido del navegador usa proveedores y base de datos reales: análisis de fideos y salsa separados, cambio de fideos de 200 a 300 g, búsqueda de plátano en español y cambio de su porción de 80 a 120 g, guardado como frecuente y como comida, recarga, acceso desde historial y reutilización de la favorita. Las consultas de verificación comprueban cantidades, calorías y referencias de cada ítem guardado.

## Destinos

- Supabase existente: `ylirrvllpwghktugbdxh`; funciones `analyze-meal`, `parse-meal-text` y `search-foods` respaldadas y publicadas. No se repitió la migración aplicada el 8 de octubre.
- Vercel existente: proyecto `nutricionapp`, `prj_xpMJ7iR8zkdkYGjWdZTa3yAfRAnD`, equipo `team_M17DUR4Kn9NfnqdsYfdn6XNn`.
- Frontend promovido: `dpl_4ebraXT3mzMPhnsfUgsrS9QEGx41`. Se reutilizó el frontend ya preparado porque las correcciones posteriores solo afectan al backend y la documentación.
- Dominio público conservado y verificado: https://dist-two-alpha-18.vercel.app.

Las evidencias detalladas, capturas y respaldos permanecen en `supabase/.private/`, excluido de Git. No se guardaron sesiones en archivos ni se publicaron secretos.

## Límites comprobados

La identificación y las referencias siguen dependiendo de Gemini y USDA y de sus cuotas. Una comida ambigua puede conservar estimaciones sin atribución USDA; no se obliga a que cada alimento tenga una referencia. La prueba admite ese comportamiento, pero exige referencias compatibles para fideos, salsa y leche. La prueba final obtuvo las cuatro referencias. La porción requiere revisión del usuario.

Texto se comprobó con proveedores reales en API y navegador. Foto y audio comparten el enriquecimiento y están cubiertos por pruebas automatizadas de sus handlers; no se probaron cámara o micrófono en dispositivos físicos durante esta continuación.
