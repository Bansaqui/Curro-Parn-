# QA — Fase 2.3.1

Rama existente `feat/worker-job-interest`. Commit anterior/base del parche incremental: `dd867b88a8a709cd26e197df2842d89cdcfcf6f2`. No se crea otra rama.

## Resultados

- npm ci: exit 0, 403 paquetes, 404 auditados, 0 vulnerabilidades. Aviso heredado de ESLint 9.39.5 fuera de soporte.
- npm test: 259/259 pruebas, 14 archivos. Incluye 226 anteriores y 33 nuevas.
- npm run lint: exit 0 tras corregir la lectura del reloj durante render; se utiliza una hora fijada por petición.
- npm run typecheck: exit 0.
- npm run build: exit 0.
- npm run test:security: exit 0, sin secretos detectados en 152 archivos del repositorio y 21 bundles; .env.local ignorado. El análisis por patrones no garantiza ausencia absoluta.
- npm run test:routes: exit 0; 17 comprobaciones con servidor de producción arrancado en 127.0.0.1:3002, sin sesión ni escrituras remotas.

## Pruebas nuevas

ON/OFF mediante profile preservando nombre y bio leídos en servidor; sin comandos de borrado de franjas. Worker only y rechazo de datos de formulario falsificados. Mensajes ON sin franjas y OFF con franjas, franjas caducadas, próxima franja/turno en curso, cobertura exacta o insuficiente, rangos ajenos y rangos contiguos. OFF tiene prioridad sobre cobertura; una candidatura aplicada mantiene «Interés enviado». Se prueban restauración de OFF después de añadir una franja, fallo parcial y respuesta de creación incierta sin repetición automática.

## QA de navegador aislada

En `/polish.html`: interruptores ON/OFF, avisos exactos, próxima franja y enlaces de Inicio, Actividad informativa, falta de cobertura con «Ajustar disponibilidad» y «Interés enviado» deshabilitado. El interruptor queda disabled durante «Guardando…» y, tras error simulado, no afirma un estado nuevo: ofrece comprobarlo. Vista móvil de 390 × 844 sin desbordamiento horizontal, sin errores ni warnings de consola observados. Se usan componentes reales y respuestas simuladas; no se escribe en Supabase.

## Riesgos y conservación

Profile reemplaza nombre/bio/available: se conservan los datos leídos en servidor, pero no ofrece control de concurrencia entre pestañas. Crear franja desde OFF requiere dos RPC porque availability activa el perfil. La restauración OFF es posterior, no atómica; hay una ventana de ON y riesgo de éxito parcial. Se muestra aviso y se refresca el estado; no se borra la franja ni se repite la creación. Una garantía atómica requiere un futuro ajuste remoto autorizado. Revisar este riesgo antes de mergear.

No se crearon migraciones ni se modificó Supabase remoto (solo lectura de la definición de profile). No hay nuevas dependencias, variables de entorno ni datos remotos. V9.4.8 y todo prototype/ se conservan. Ambas copias HTML mantienen SHA-256 `2fb8548b43577ac113380bbcd7b21aae49edaba62cc03f20f05ce960277180ea`.

Publicación de negocios y RPC apply siguen sin cambios. Fuera de alcance: selección, assignments, pagos, contratación, chat, push, geolocalización, ranking y editar/cancelar Curros. La sección Actividad es solo texto. No se hace merge. Se recomienda una prueba autenticada real autorizada antes del merge; las pruebas de RPC actuales usan dobles.
