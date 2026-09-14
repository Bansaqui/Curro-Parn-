# QA — Fase 2.3: interés del profesional

Base: `origin/main` en `c0c027d` (Fases 2.1 y 2.2 mergeadas). Rama: `feat/worker-job-interest`.

| Comando | Resultado |
| --- | --- |
| npm ci | Exit 0; 403 paquetes instalados, 404 auditados; 0 vulnerabilidades |
| npm run lint | Exit 0 |
| npm run typecheck | Exit 0 |
| npm test | Exit 0; 226/226 pruebas en 12 archivos (170 previas y 56 nuevas) |
| npm run build | Exit 0; /curros compilada como ruta SSR |
| npm run test:security | Exit 0; sin secretos detectados en 141 archivos y 21 bundles; .env.local ignorado |
| npm run test:routes | Exit 0; 17 comprobaciones HTTP sin sesión ni escrituras remotas |

El análisis de secretos por patrones no demuestra ausencia absoluta de secretos. ESLint 9.39.5 conserva su aviso previo de fin de soporte. No se modificaron dependencias ni lockfile.

## Cobertura automatizada

Perfil worker y guard server-side; business rechazado antes de leer datos o mutar. Filtro de cancelados, iniciados y especialidad incompatible, orden cronológico sin priorizar urgente. Las candidaturas propias existentes permanecen una sola vez; se ignoran candidaturas de otros profesionales.

Validación UUID, payload exclusivo `{job_id}` hacia `cp_command('apply')`, respuesta normal y respuesta `{id, unchanged:true}`. Errores por disponibilidad, solapes, plazas, permisos y candidatura duplicada. Respuestas ambiguas no se reintentan. El servidor no vuelve a mutar applied/selected, no reenvía rejected/withdrawn y permite pasar invited a applied mediante la RPC existente.

Parsing estricto de applications y business_name; ausencia de campos falla de forma cerrada. Los tests de guards existentes siguen comprobando el rol de base de datos y el rechazo de user_metadata como autorización. Las pruebas de RPC y acciones usan dobles, sin datos remotos.

## Navegador aislado

En `/interest.html` del servidor `npm run qa:ui`: componentes reales, datos sintéticos y respuesta simulada. Sin importar Supabase ni cargar `.env.local`.

- Tarjeta con negocio, local, especialidad, fechas peninsulares, 85,50 €, plazas y urgente.
- «Me interesa» pasa a «Enviando interés…» disabled durante la espera; evita doble envío desde el botón.
- Candidatura previa muestra «Interés enviado» disabled.
- Error simulado visible, con el formulario nuevamente disponible.
- Estado vacío: «Ahora mismo no hay Curros compatibles contigo.»
- Vista móvil de 390 × 844 sin desbordamiento horizontal (375 px útiles), sin errores o warnings de consola observados.

## Alcance y riesgos

No se escribió ni modificó Supabase remoto: solo lectura del contrato apply. No hay migraciones nuevas, cambios de tipos generados, prototipo ni históricos. Ambas copias V9.4.8 conservan SHA-256 `2fb8548b43577ac113380bbcd7b21aae49edaba62cc03f20f05ce960277180ea`.

La implementación de disponibilidad y las acciones/comando/formulario/listado de publicación de negocios permanecen sin cambios. Solo se extienden el snapshot compartido, el nombre de negocio de jobs, navegación y fixtures de pruebas para la nueva fase.

Selección, assignments, pagos, contratación, chat, reviews y retirada no se implementan. Mostrar un estado selected ya existente es solo informativo y no ejecuta selección.

La compatibilidad mostrada es por especialidad y fecha; la RPC decide cobertura de disponibilidad, solapes y plazas al enviar. El listado excluye turnos ya iniciados incluso con candidatura previa. No es un historial completo. El backend limita el snapshot a 200 jobs y 500 applications; una candidatura antigua ausente del snapshot seguirá protegida contra duplicados en apply.

Se recomienda prueba manual real antes del merge con cuenta/datos autorizados: enviar interés, recargar y comprobar persistencia, duplicate submit y rechazo por falta de disponibilidad. No se creó ninguna candidatura real durante este encargo. La QA aislada no demuestra el recorrido autenticado extremo a extremo. No se hace merge automático.
