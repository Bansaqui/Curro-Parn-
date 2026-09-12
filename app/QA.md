# QA — MVP Auth foundation

Revisión del 12 de septiembre de 2026. Rama `feat/mvp-auth-foundation`. Alcance: Auth SSR, onboarding y primer negocio/local; sin ampliar el marketplace.

## Estado recuperado

La base, los clientes SSR, Auth, onboarding y las RPC ya estaban implementados. No había commit nuevo; `main` seguía en `a7ef6bf`. Había 36 pruebas ejecutadas y cinco pruebas adicionales de Auth guardadas antes del corte. El servidor local anterior ya no estaba activo. No había aprobación pendiente; se solicitó el acceso de red necesario para los checks y la publicación de la rama.

## Comprobaciones

| Comprobación         | Resultado                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Vitest               | 47 pruebas, 6 archivos, sin fallos                                                                   |
| ESLint               | Sin errores ni advertencias                                                                          |
| TypeScript           | `tsc --noEmit`, strict, correcto                                                                     |
| Next.js              | Build de producción correcto                                                                         |
| Smoke HTTP           | 14 comprobaciones sin sesión, correctas                                                              |
| Seguridad            | Sin secretos de alta confianza detectados en archivos Git/candidatos y bundle; `.env.local` ignorado |
| npm audit            | 0 vulnerabilidades reportadas                                                                        |
| Prototipo y Supabase | Comparación con base sin cambios                                                                     |

Las pruebas de servidor cubren ausencia de sesión, correo sin confirmar, perfil ausente, roles de dominio frente a metadata manipulable, rechazo worker/business, pertenencia owner/manager y rechazo de staff o identificadores de negocio ajenos. También cubren payloads originales de las RPC, especialidades permitidas, ambas aceptaciones, recuperación, logout, cambio de contraseña y destinos de redirección permitidos.

## QA manual en navegador

- Landing: texto, enlaces Crear cuenta/Entrar, navegación y diseño de escritorio/móvil.
- Registro: campos y labels, confirmación de contraseña, pantalla a 390 px sin desbordamiento horizontal.
- Login y recuperación: navegación, formularios, validación nativa de campos obligatorios. No se enviaron credenciales ni correos.
- Loading real de navegación observado al abrir login.
- `/onboarding` sin sesión redirige a `/login?next=%2Fonboarding`; el smoke comprueba también inicio, negocio, local y cambio de contraseña.
- Onboarding con componentes reales en `npm run qa:ui`: Profesional exige especialidad; Negocio no muestra especialidad; ambas casillas obligatorias por separado; enlaces legales visibles; loading con botón disabled; error recuperable; diseño móvil.
- Corrección encontrada y repetida: React restablecía inputs tras una acción resuelta con error, desajustando rol y especialidad. El formulario conserva ahora las entradas al reintentar. Comprobados nombre, rol y casillas después del error.
- Ajustado el botón de la landing para evitar el salto de «Crear cuenta» en móvil; botones apilados en anchos de hasta 360 px.
- Avisos legales informativos comprobados; sin textos legales inventados.
- Sin errores de consola observados en las pantallas públicas examinadas.

El fixture se sirve solo en loopback, fuera del App Router. No carga variables locales, sustituye acciones por dobles de prueba y prohíbe importar Supabase. No representa una sesión real ni una escritura real. Su envío simulado tampoco registra aceptaciones.

## Integración y preservación

La app llama realmente a `cp_onboard` y a `cp_command` para snapshot, create_business y create_venue. No inserta perfiles, aceptaciones, negocios o locales directamente. Clientes tipados desde el único archivo generado del repositorio. Roles/pertenencias se consultan en servidor; RLS y la Command API permanecen como autoridad final.

No se ejecutaron migraciones, resets, inserts ni cambios de configuración en remoto. La comprobación remota de lectura confirmó que términos y privacidad siguen en `mvp-draft-1`, `status=draft`, `production_ready=false`. Las 17 migraciones, los tipos generados y todos los históricos del prototipo se conservan.

SHA-256 esperado de current y V9.4.8 histórica:

`2fb8548b43577ac113380bbcd7b21aae49edaba62cc03f20f05ce960277180ea`

GitHub Pages sigue destinado exclusivamente a V9.4.8. No se despliega la app SSR en esta fase.

## Límites y revisión antes de merge

1. **Pendiente una prueba autenticada real autorizada:** registro y correo, confirmación PKCE, refresco de cookies, recovery, logout y onboarding de ambos roles hasta crear negocio/local. Las pruebas actuales usan dobles para estas escrituras; no prueban RLS ni las RPC extremo a extremo. No se han creado usuarios o datos remotos para satisfacer el QA.
2. **Comprobar Site URL, Redirect URLs y entrega/plantillas de correo** con el origen que se vaya a usar. No se ha modificado la configuración de Auth. Usar el mismo navegador/origen para PKCE.
3. **ESLint 9.39.5 está fuera de soporte según npm.** Se mantiene por los peer ranges actuales de los plugins de Next; lint pasa sin forzar compatibilidad. Revisar actualización a ESLint 10 cuando la cadena completa lo admita. TypeScript 6.0.3 evita la incompatibilidad de la API de TypeScript 7 con typescript-eslint.
4. **No listo para producción legal.** Completar el TODO legal de README, incluyendo textos, asesoría, versión, SHA-256 y aprobación. La RPC toma la versión vigente al ejecutar; antes de publicar revisiones legales debe garantizarse la vinculación atómica entre versión mostrada y versión aceptada. No se cambia el esquema en esta fase.
5. **Concurrencia:** pending evita dobles clics y se revisa la existencia previa; las RPC actuales de creación no aportan una clave de idempotencia para peticiones simultáneas desde varias pestañas. Considerarlo antes de ampliar uso.
6. **Alcance de seguridad:** el escaneo de patrones y `npm audit` reducen riesgos, no constituyen una auditoría exhaustiva. La revocación global de refresh tokens no invalida instantáneamente access tokens ya emitidos; documentado para futuras operaciones sensibles.

El PR queda para revisión humana, sin merge automático. Ningún resultado de QA simulado debe presentarse como validación real del proyecto remoto.
