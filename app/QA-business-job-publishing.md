# QA — Fase 2.2: publicación de Curros

Base: `origin/main` en `16baa03` (Fase 2.1 mergeada). Rama: `feat/business-job-publishing`.

## Comprobaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| npm ci | Exit 0; 403 paquetes instalados, 404 auditados; 0 vulnerabilidades |
| npm run lint | Exit 0, sin errores |
| npm run typecheck | Exit 0 |
| npm test | Exit 0; 170/170 pruebas, 10 archivos; 79 anteriores y 91 nuevas |
| npm run build | Exit 0; nueva ruta SSR /negocio/curros/nuevo compilada |
| npm run test:security | Exit 0; sin secretos detectados en 128 archivos del repositorio y 20 bundles; .env.local ignorado |
| npm run test:routes | Exit 0; 16 comprobaciones HTTP, sin sesión ni escrituras remotas |

El aviso de deprecación de ESLint 9.39.5 es anterior a esta fase; no se modificaron dependencias ni lockfile. Se ejecutó `npm run test:security` sobre repositorio y bundles de navegador antes del commit; un análisis por patrones no demuestra ausencia absoluta de secretos.

## Cobertura

Validación de título, descripción, especialidad, plazas, euros (coma/punto, precisión y límites), fechas vacías/incorrectas/pasadas, duración máxima y cambios de horario. Payload exacto de `cp_command('publish')`, respuestas inválidas y errores del backend. Permisos owner/manager, rechazo de staff y worker, negocio inexistente, local ajeno/inactivo y membresía ausente. Parsing de jobs y listado propio con próximos primero. Las acciones revalidan y redirigen solo tras éxito.

Se conservan las pruebas reales de guards de perfil business/worker; las nuevas pruebas de acciones y RPC usan dobles. Las pruebas antiguas de disponibilidad y rutas solo añaden `jobs: []` a sus datos de snapshot.

## Navegador: fixture aislado

En `http://127.0.0.1:3001/jobs.html`, formulario y listado reales, acción simulada y sin Supabase:

- Cambio de negocio limita el selector a su local y reinicia la selección.
- Fin anterior al inicio muestra mensaje en español.
- Importe `85,50` admitido.
- Envío válido muestra «Publicando…» y botón disabled.
- Error simulado visible tras la espera; los datos del formulario se conservan.
- Estado vacío, tarjeta publicada/urgente, fecha, plazas y euros visibles.
- Vista móvil solicitada de 390 × 844, sin desbordamiento horizontal (375 px útiles con barra de desplazamiento), y vista de escritorio revisadas.
- Sin errores ni warnings de consola en la comprobación.

## Conservación y límites

Supabase remoto: solo lectura del contrato existente; no escrituras, migraciones, publicaciones ni cambios de configuración. Supabase local, tipos y migraciones originales sin cambios. V9.4.8, versiones históricas y pantalla/feature de disponibilidad sin cambios. SHA-256 de ambas copias HTML: `2fb8548b43577ac113380bbcd7b21aae49edaba62cc03f20f05ce960277180ea`.

Candidaturas, «Me interesa», selección, asignaciones, pagos, contratación, Seguridad Social, mensajería, reviews, edición y cancelación no se implementan en esta fase.

Antes de merge se recomienda una prueba autenticada real con una cuenta y datos de prueba autorizados: owner/manager publica, staff/worker no publica, y el Curro aparece en Inicio. No se realizó esa escritura en este encargo. La prueba aislada no demuestra el flujo extremo a extremo con Supabase.

La RPC existente no incluye idempotencia: una respuesta perdida puede corresponder a una publicación guardada. No se reintenta automáticamente; la UI pide revisar Inicio. Los límites heredados son 50 publicaciones/24 h y 200 Curros por snapshot, sin paginación. Los documentos legales siguen pendientes, sin cambios. No se realiza merge automático.
