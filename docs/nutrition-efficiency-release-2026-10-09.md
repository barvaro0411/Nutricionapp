# Ahorro de llamadas y cálculos nutricionales — 9 de octubre de 2026

Implementado y publicado en las cinco funciones del proyecto Supabase existente `ylirrvllpwghktugbdxh`. Disponible desde [Coach IA](https://dist-two-alpha-18.vercel.app/coach) y los flujos habituales de foto, texto, dictado y búsqueda. Esta etapa actualiza el backend y conserva la versión de frontend ya probada, `dpl_E6y3Ce5x4RFLjtVJFZUVKofbDy5w`. No requiere migraciones, secretos nuevos, facturación ni nuevos modelos.

## Cambios

- Las preguntas explícitas de calorías registradas/restantes y proteína restante se contestan mediante cálculos del servidor, con las metas y registros actuales. Cargan cuatro grupos de datos en paralelo en lugar de siete y no llaman a modelos. Preguntas que piden consejos, incluyen condiciones, mencionan otro día o dependen de mensajes anteriores continúan con Groq/Gemini y el contexto completo del coach.
- Una nueva consulta lee las comidas actualizadas; un reintento con el mismo UUID conserva la respuesta original. Las dos rutas usan el mismo guardado atómico y protección de cuota publicados anteriormente. La cuota de la app sigue siendo 100 solicitudes diarias y 10 por minuto; se ahorra cuota de proveedores externos.
- Las recomendaciones conservan metas, saldos, nutrientes por comida, alimentos, cantidades, unidades, plan y seis mensajes recientes. Los alimentos se envían como `[nombre, cantidad, unidad]`, con explicación en la instrucción del sistema. Los líquidos registrados en ml mantienen su unidad.
- USDA reutiliza referencias válidas por ID entre lotes distintos y comparte solicitudes concurrentes solapadas. Solo obtiene los IDs faltantes, en lotes de veinte y hasta tres solicitudes simultáneas por operación. La caché conserva hasta 300 referencias por instancia durante 24 horas, con copias independientes para sus consumidores; datos incompletos o vencidos se descartan.
- `nutritionMath.ts` centraliza suma de nutrientes, escalado desde referencias por 100 g/ml y cálculo de saldos. Corrige artefactos de coma flotante, conserva la energía de la fuente y muestra el exceso cuando se supera una meta. No sustituye nutrientes verificables por la fórmula 4/4/9 ni modifica metas o datos guardados.
- Jest excluye las copias privadas de publicación de su mapa de módulos, evitando colisiones con el paquete principal.

## Evidencia

- 242 pruebas en 31 suites correctas; TypeScript del frontend, ESLint y tipos de cinco funciones Edge sin errores.
- La prueba local usa sesión/base de datos, USDA y Groq reales. Las preguntas numéricas no producen llamadas a proveedores. Tres lotes solapados de referencias USDA requieren dos llamadas y conservan los mismos nutrientes. Las preguntas con consejos siguen utilizando Groq.
- Cuatro comprobaciones contra el backend publicado: respuesta calculada; UUID repetido sin otra reserva de cuota ni mensajes duplicados; cambio de comidas seguido de saldos nuevos; consejos con IA y contexto actual.
- Cinco flujos de proveedores reales: coach, texto con referencias USDA, búsqueda en español, dictado Whisper y foto Gemini. Cada cuenta e imagen temporales se eliminaron.
- Diez comprobaciones en el sitio público: formato del historial, lectura, animación, movimiento reducido, pérdida de respuesta y reintento con el mismo UUID, cálculos visibles, Gemini Live con audio, liberación del micrófono, historial tras recargar y diseños móvil/escritorio. La voz devolvió 270 240 bytes de audio y guardó un turno completo; sin errores de página.
- Se respaldaron las funciones anteriores desde `f3d6a04` y se publicaron `analyze-meal`, `parse-meal-text`, `search-foods`, `nutrition-coach` y `coach-live-session`. Los cambios locales ajenos a esta etapa se conservaron fuera de la publicación y del commit.

Las pruebas cubren saldos negativos, actividad registrada, metas especiales de domingo, preparación de alimentos, densidad de líquidos, referencias incompletas, expiración, lotes concurrentes y actualización de registros. La caché USDA sigue siendo por instancia; las cuotas externas y la revisión de porciones estimadas continúan aplicando.
