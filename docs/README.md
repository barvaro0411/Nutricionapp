# 📚 Índice de Documentación de Nutricionapp

Guía centralizada de documentación técnica y operativa del proyecto.

## 1. Arquitectura y Base de Datos
- **[Arquitectura de Base de Datos](ARQUITECTURA_BASE_DE_DATOS.md)**: Esquema relacional en PostgreSQL (Supabase), políticas de seguridad por fila (RLS), tablas de perfiles, comidas, metas, agua y favoritos.

## 2. Inteligencia Artificial y Proveedores
- **[Proveedores y Cuotas de IA](ai-providers.md)**: Distribución de modalidades entre Groq (texto, transcripción Whisper, visión Qwen), Gemini (visión Flash-Lite, Live) y USDA. Manejo de cuotas gratuitas, timeouts y respaldos.
- **[Publicación de Proveedores (2026-10-09)](ai-providers-release-2026-10-09.md)**: Registro de verificación y publicación de la distribución multimodelo.

## 3. Coach Nutricional y Voz
- **[Coach: Respuestas y Voz](coach-voice.md)**: Arquitectura del coach, lectura de respuestas con síntesis de voz del dispositivo (`expo-speech` / Web Speech API) y conversación en tiempo real con Gemini Live (`gemini-3.8-live`).
- **[Publicación de Voz del Coach (2026-10-09)](coach-voice-release-2026-10-09.md)**: Registro de validación y despliegue del coach por voz y formato Markdown.

## 4. Referencias Nutricionales USDA
- **[Integración USDA FoodData Central](usda-integration.md)**: Consultas de Foundation, SR Legacy y FNDDS; validación de identificadores, densidad de líquidos, unidades y persistencia.
- **[Publicación USDA (2026-10-09)](usda-release-2026-10-09.md)**: Pruebas de integración, verificación de búsquedas y persistencia en favoritos.
- **[Punto de Continuación USDA](usda-continuation.md)**: Registro histórico y herramientas operativas locales.

## 5. Mantenimiento y Calidad de Código
- **[Tarea de Limpieza y Optimización](antigravity-project-cleanup.md)**: Especificación de la auditoría y refactorización acotada.
- **[Informe de Limpieza y Optimización](project-cleanup-report.md)**: Reporte detallado de hallazgos, lotes aplicados, métricas comparativas y estado de la rama.

## 6. Especificaciones Técnicas
- **[Unidades Líquidas y Registro de Bebidas](superpowers/specs/2026-10-07-liquid-units-and-beverage-logging-design.md)**: Diseño de soporte para `ml` y conversión de densidad.
