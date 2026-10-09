# Tarea para Antigravity: optimizar, limpiar y ordenar Nutricionapp

## Objetivo

Mejora la organización, mantenibilidad y rendimiento del proyecto conservando su comportamiento actual. Realiza una auditoría breve y después implementa las mejoras justificadas en lotes pequeños. La entrega debe incluir cambios reales, verificaciones y un resumen de resultados.

Trabaja desde la carpeta `C:\Users\alvaro\Desktop\nutricionapp`. La última versión funcional conocida al preparar esta tarea es el commit `74fd076`, publicado el 9 de octubre de 2026. Verifica el HEAD actual antes de empezar; puede haber commits posteriores.

## Contexto que debes leer

- [README](../README.md): arranque, estructura y comandos.
- [Proveedores y cuotas](ai-providers.md): Groq, Gemini, Whisper y USDA.
- [Coach por voz](coach-voice.md) y [verificación de publicación](coach-voice-release-2026-10-09.md).
- [Integración USDA](usda-integration.md): unidades, referencias nutricionales y persistencia.
- `package.json`, `tsconfig.json`, configuración de Expo/Metro/Babel, `vercel.json`, `.gitignore`, `.vercelignore`, `supabase/config.toml` y `supabase/functions/deno.json`.

El frontend usa Expo SDK 52, React Native, Expo Router, TypeScript, React Query y Zustand. El backend usa Supabase con funciones Edge en Deno. La versión actual pasó 206 pruebas en 29 suites, tipos, lint, compilación PWA y una prueba real del coach por texto y voz.

## Forma de trabajar

1. Revisa el estado de Git y conserva los cambios existentes. Usa una rama `chore/project-cleanup`; si ya existe, inspecciónala antes de reutilizarla. No restablezcas archivos ni reescribas el historial para conseguir un árbol limpio.
2. Ejecuta las verificaciones iniciales y registra problemas previos. Crea un inventario de carpetas, responsabilidades, dependencias, duplicaciones, candidatos a código sin uso y oportunidades de rendimiento. Excluye los secretos y archivos privados de búsquedas amplias.
3. Escribe `docs/project-cleanup-report.md` con hallazgos concretos, evidencia, prioridad y archivos afectados. Distingue problemas comprobados de hipótesis. Ejecuta las mejoras acotadas que el inventario justifique; documenta las que requieran un cambio de arquitectura fuera de esta tarea.
4. Trabaja por lotes: organización y documentación; código y tipos; rendimiento medido. Conserva commits pequeños y descriptivos. No detengas todo el trabajo por decisiones rutinarias de formato o nombres.
5. Actualiza imports, pruebas, scripts y documentación cuando muevas un archivo. Al terminar, revisa el diff completo y entrega el resultado listo para revisión en la rama.

## Mejoras a evaluar

- Separar responsabilidades de pantallas y componentes extensos cuando simplifique el código.
- Unificar utilidades y tipos duplicados, manejo de errores y convenciones de nombres.
- Retirar imports y código sin uso únicamente después de comprobar referencias estáticas, rutas dinámicas, registros de plugins, pruebas y scripts.
- Reducir renders, solicitudes duplicadas, trabajo repetido y tamaño del bundle con evidencia antes/después. Aplica memoización cuando resuelva un problema medido.
- Organizar documentación y scripts por propósito, conservando enlaces y puntos de entrada.
- Revisar dependencias sin uso y compatibilidad con Expo SDK 52. Mantener cambios acotados y el lockfile coherente.

## Comportamientos que debes conservar

- Inicio de sesión, navegación, onboarding, metas, registros, historial, favoritas y reportes.
- Fotos, etiquetas, texto y dictado de comidas; cantidades en gramos/mililitros, nutrientes y referencias USDA al guardar y reutilizar.
- Coach con metas exactas, registros del día e historial, usando `America/Santiago`.
- Lectura Escuchar/Detener con la voz del dispositivo.
- Gemini Live en web/PWA: token temporal, contexto fijado en el servidor, micrófono solo al iniciar, cierre al cancelar/salir, audio ordenado, interrupciones y guardado de turnos sin duplicados. La variante nativa conserva la lectura; Live nativo no forma parte de esta limpieza.
- Autenticación y propiedad de datos, cuotas, plazos compartidos, reintentos acotados y respaldos entre proveedores. Conserva la selección de un proveedor por consulta para evitar duplicar consumo.

## Límites de la tarea

- Mantén Expo Router en `app/`. No muevas rutas para embellecer el árbol de carpetas. Conserva la resolución `.web.ts`/`.ts`, los aliases y las extensiones de imports que necesita Deno.
- Las funciones Edge importan algunas utilidades de `src/`. Revisa esas dependencias antes de reorganizar frontend o backend. `npm run type-check` excluye `supabase/functions`: comprueba Deno por separado.
- Mantén las claves de IA y la clave de servicio de Supabase solo en el servidor. El cliente utiliza las dos variables públicas de Supabase. No imprimas ni copies valores de `.env*`, sesiones, tokens, respaldos o `supabase/.private/` al informe, Git o bundle.
- Preserva archivos privados, secretos y respaldos locales. No hagas limpiezas recursivas de carpetas para ganar espacio; si hay candidatos a eliminar, documenta rutas, uso y motivo.
- Conserva `patches/`, los overrides, `postinstall`, los controles de seguridad y el script PWA. No uses `npm audit fix --force` ni actualices versiones mayores como parte de una limpieza general.
- Usa los proveedores gratuitos configurados. No actives OpenAI de pago, facturación, nuevos proyectos ni servicios de pago.
- El alcance es código y verificaciones locales. No ejecutes scripts de publicación, migraciones remotas ni operaciones sobre datos de usuarios. Deja la rama preparada para revisión; conserva el despliegue actual.

## Verificación y entrega

En PowerShell usa estos comandos y corrige los fallos introducidos:

```powershell
npm.cmd run type-check
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run build:pwa
git diff --check
```

Comprueba también los tipos de las cinco funciones Edge con Deno o una comprobación equivalente compatible con sus imports. No ejecutes helpers privados sin leerlos: algunos publican o modifican datos. Añade pruebas cuando cambies lógica con riesgo de regresión; conserva las existentes y no rebajes validaciones para hacerlas pasar.

Verifica en navegador los flujos afectados, la consola, las vistas móvil/escritorio y la limpieza de recursos de voz. Usa mocks o fixtures sintéticos en las comprobaciones locales; registra con claridad lo que no se probó en un dispositivo o proveedor real.

El informe final debe contener: problemas resueltos y evidencia, archivos movidos/eliminados con justificación, métricas comparables antes/después, resultados de comandos, limitaciones pendientes y rama/commits entregados. Las optimizaciones sin una medición se describen como mejoras de estructura, no como ganancias de rendimiento demostradas.

Referencia para el uso del agente: [buenas prácticas oficiales de Antigravity](https://antigravity.google/docs/cli/best-practices).
