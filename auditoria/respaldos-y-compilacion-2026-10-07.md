# Respaldos y herramientas de compilación — 7 de octubre de 2026

## Herramientas corregidas

Se convirtieron las modificaciones locales de `braces` y `node-forge` en parches registrados en Git. Antes, una instalación nueva podía perder esas correcciones. También se actualizó `sprintf-js` de 1.0.3 a 1.1.3 y se añadió su corrección local.

| Paquete | Corrección comprobada |
| --- | --- |
| `braces@3.0.3` | Rechaza patrones y árboles con anidamiento excesivo antes de agotar la pila. Conserva los patrones habituales. |
| `node-forge@1.4.0` | Rechaza elementos adicionales en el identificador del algoritmo de firmas RSA PKCS#1 v1.5. Sigue aceptando firmas válidas, con y sin el parámetro NULL opcional. |
| `sprintf-js@1.1.3` | Valida la precisión numérica antes de llamar al formateador nativo y limita el ancho del campo a un millón de caracteres. Conserva formatos normales, posicionales y con nombres. |

Las versiones están fijadas mediante `overrides`. `postinstall` aplica los parches con `--error-on-fail` y ejecuta [pruebas de seguridad de las herramientas](../scripts/check-tooling-security.cjs). Si un parche no se aplica o reaparece alguno de los casos probados, la instalación falla. La misma comprobación se ejecuta en la instalación de Vercel.

Referencias de los casos corregidos: [anidamiento de braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [verificación RSA de node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) y [precisión de sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

`npm audit` sigue informando **60 avisos en el árbol completo, 54 altos y 6 moderados**, y **38 al omitir dependencias de desarrollo, 32 altos y 6 moderados**. Todos se originan en esos tres paquetes y sus dependientes. La auditoría compara números de versión y no reconoce estos parches locales; no se ocultaron ni se suprimieron los avisos. Los tres casos descritos tienen correcciones y regresiones verificadas. Las versiones publicadas consultadas aún no incorporan soluciones compatibles. No se aplicó el cambio automático incompatible de Expo/React Native.

## Verificación de compilación

- `npm ci` completado desde una instalación limpia; los cinco parches, incluidos los anteriores de Metro y query-string, se aplicaron correctamente.
- ESLint y TypeScript sin errores ni advertencias.
- 86 pruebas aprobadas en 16 suites, incluyendo tres regresiones nuevas de las herramientas.
- Compilación web/PWA y exportación Android correctas después de reinstalar.
- El JavaScript web conserva el mismo contenido que la versión anterior probada: `entry-69aabd8ac40c6ff0df0d5e336423b1ff.js`, 2.537.929 bytes. El cambio afecta a las herramientas de instalación y compilación.
- Los datos originales de las cinco tablas contrastadas en la auditoría anterior se conservaron.

## Estado del proveedor

La consulta autenticada `supabase backups list` devolvió **cero puntos de recuperación disponibles** y `pitr_enabled=false`. El indicador interno `walg_enabled=true` no demuestra que exista un respaldo recuperable ni una retención garantizada. No se modificaron el plan, la facturación ni la configuración de recuperación de Supabase.

Los [respaldos de base de datos de Supabase](https://supabase.com/docs/guides/platform/backups) no incluyen los bytes de los archivos de Storage. Por eso la copia realizada incluye la base y las fotos por separado.

## Copia privada y recuperación

Se creó una copia consistente mediante PostgreSQL 17.11, con una transacción de solo lectura y un snapshot compartido por el manifiesto y los volcados. La conexión validó el certificado y el nombre del servidor con la CA de Supabase. Se guardaron un archivo PostgreSQL en formato custom, SQL de restauración de la aplicación, roles sin contraseñas administrativas, metadatos y los bytes de todas las fotos presentes.

El paquete se cifró con AES-256-GCM y una clave aleatoria protegida con Windows DPAPI. La carpeta limita el acceso al usuario Windows actual y SYSTEM. Se descifró una copia para la recuperación; una copia alterada fue rechazada por la autenticación del cifrado.

La recuperación se ejecutó en PostgreSQL 17.11 separado, escuchando únicamente en `127.0.0.1`, con contraseña propia. Windows bloqueó `pg_restore` y `psql`; se respetó esa protección y se restauró el SQL del mismo snapshot mediante el cliente `pg`. No se restauró ni se modificó la base de producción.

| Comprobación | Resultado |
| --- | --- |
| Esquemas restaurados | `public`, `app_private`, `auth`, `storage`, `supabase_migrations` |
| Tablas y filas | 58 tablas, 319 filas; hashes exactos, propietarios y RLS coincidentes |
| Cuenta existente | 1; filas de Auth, identidad y hashes de contraseña incluidos en la comparación |
| Políticas y funciones | 35 políticas y 46 funciones coincidentes |
| Fotos | 2 archivos, 3.403.782 bytes; tamaño y SHA-256 coincidentes después de recuperar |
| Integridad | Archivo de base, SQL y fotos verificados; paquete cifrado alterado rechazado |

La copia validada está en `supabase/.private/backups/2026-10-08T01-59-08-987Z/snapshot.enc`, con 3.583.662 bytes. La fecha del directorio está en UTC; corresponde al 7 de octubre en Chile. SHA-256 del paquete cifrado: `66009e365cd70546fc24965aa1b3ac2333f31448edbf7da981362e92f91e924d`.

La evidencia privada está en `supabase/.private/latest-backup-verification.json`. La base temporal se apagó y se eliminaron sus archivos y las copias sin cifrar. Las copias, credenciales y claves quedan fuera de Git y del despliegue. Los archivos de fotos se recuperaron en disco; no se subieron a un segundo servicio Storage ni se modificaron los originales.

## Límites pendientes

No hay una copia externa automática configurada ni puntos de recuperación del proveedor disponibles. La clave de la copia local está protegida mediante Windows DPAPI para el usuario actual: para recuperar en otro equipo hay que conservar el perfil Windows o exportar de forma segura la clave a un gestor externo. La copia local no sustituye una estrategia de respaldo externo periódico.

La prueba de base aislada no equivale a levantar toda la infraestructura administrada de Supabase: no valida ejecución de sus extensiones de mantenimiento, servicio Auth, SMTP ni el servicio Storage. Las pruebas anteriores de cuentas y almacenamiento se documentan en el [informe de seguridad](seguridad-cuentas-2026-10-07.md).

## Git y Vercel

Los cambios de código se subieron a `main` en [GitHub](https://github.com/barvaro0411/Nutricionapp), commit `4808ab5b760680b6d83861db67357601fb896e55`.

Se compiló en Vercel sin reutilizar la caché. El registro de instalación confirmó los cinco parches y aprobó `check:tooling` antes de compilar. El despliegue se verificó y luego se promovió al dominio público:

- [Aplicación publicada](https://dist-two-alpha-18.vercel.app).
- [Despliegue verificado](https://nutricionapp-3zjgorozo-barvaro0411s-projects.vercel.app), estado `READY`, identificador `dpl_7hFnvpk2zsdgrU2aTMs8tQo4SrGc`.
- Proyecto existente `nutricionapp`, `prj_xpMJ7iR8zkdkYGjWdZTa3yAfRAnD`; propietario, commit y destino comprobados mediante la API.
- El alias público apunta a ese mismo despliegue. Pasaron las comprobaciones de HTTPS, cabeceras, JavaScript idéntico al compilado localmente, manifest, service worker y rutas directas.
- Cero valores de claves privadas encontrados en 58 archivos compilados y los diez archivos preparados para Git. Respaldos, claves y evidencias privadas excluidos del código publicado.

La actualización de este informe se guarda en un commit posterior de documentación; no cambia los archivos de la aplicación desplegada.
