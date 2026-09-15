# QA — Fase 2.4: candidaturas y selección

Base: `origin/main` actualizado mediante fetch, commit `2063c8f53ab1f326832ed42c4c68aef0f5271ea0`. Rama nueva `feat/business-candidate-selection`. Sin push ni merge.

## Alcance y permisos

Inicio de negocio muestra candidaturas y ocupación por Curro, con acceso a `/negocio/curros/[jobId]/candidaturas`. La página y Server Action requieren perfil business; se comprueba pertenencia real y la relación candidatura/Curro/negocio. Owner y manager pueden seleccionar o descartar; staff activo consulta sin formularios de mutación. UUID inválido o negocio ajeno no acceden. No se utiliza user_metadata ni credenciales privilegiadas.

Se lista por created_at ascendente e id estable. Se presenta worker_name; la especialidad es explícitamente la del Curro, porque el snapshot no contiene la especialidad actual del candidato. No se inventan experiencia, rating ni referencias. No se entregan emails, teléfonos, CV ni documentos.

## Contrato existente

Select y reject envían únicamente application_id a cp_command. Select exige applied, Curro publicado y futuro, disponibilidad ON y cobertura; los locks existentes y las constraints controlan slots y solapes. La creación devuelve id de assignment; una selección repetida devuelve id de application con unchanged. Reject permite applied/invited y conserva la fila con state=rejected. Selected/withdrawn/rejected no se vuelven a seleccionar. No hay retry automático ni éxito optimista.

El mismo formulario bloquea ambas decisiones durante pending («Seleccionando…» / «Descartando…»). Ante error se invalidan rutas y se ofrece actualizar; no se permite repetir desde ese formulario sin lectura nueva. Solo se mapean mensajes/códigos conocidos; no se exponen errores SQL. El parámetro result de la URL no se trata como prueba de selección: la pantalla muestra el estado del snapshot.

La ocupación usa jobs.occupied del backend, que excluye cancelled/no_show/replaced, en lugar de contar applications selected o asignaciones de una lista truncada. Se muestra cubiertas/total y pendientes, se conserva el Curro lleno y se permite descartar candidaturas restantes. Slot_no lo asigna exclusivamente el backend. Una selección con assignment liberado se distingue de una plaza activa; si falta en la consulta, se pide comprobarlo.

El profesional ve «Interés enviado», «Seleccionado», «No seleccionado» y «Candidatura retirada». El rechazo no borra la candidatura ni introduce penalización. Se conservan Curros con candidatura propia, incluso pasados/cancelados, dentro del límite del snapshot; una invitación en Curro cerrado no permite enviar interés. Inicio enlaza a Ver Curros para actividad, sin nuevo módulo operativo.

## Snapshot, migraciones y notificaciones

Zod exige occupied y amplía applications con business_id, worker_name, created_at; añade assignments con id, application_id, job_id, worker_id y state. No hay valores por defecto para campos requeridos. Se descartan campos no utilizados. No se amplía el payload remoto ni se hacen consultas N+1.

Los triggers originales de applications generan notificaciones selected/rejected y se prueban, incluido no duplicar la notificación con double submit. El estado UI se deriva de applications; no se crea bandeja ni marcado de lectura, y no se envían email, push o WhatsApp. Las notificaciones ya existentes permanecen operativas según el contrato reproducido localmente.

**Ninguna migración nueva. Ninguna modificación de Supabase remoto.** Se reproducen localmente los 18 SQL de main, sin modificarlos. El despliegue previo de disponibilidad documentado en main se conserva. No hay nuevas dependencias ni variables de entorno.

## Validación ejecutada

| Comprobación | Resultado |
| --- | --- |
| npm ci | Exit 0; 404 paquetes instalados, 405 auditados, 0 vulnerabilidades |
| npm run lint | Exit 0 |
| npm run typecheck | Exit 0 |
| npm test | 359/359, 18 archivos |
| npm run build | Exit 0, incluye ruta dinámica de candidaturas |
| npm run test:security | Exit 0; sin secretos de alta confianza detectados; .env.local ignorado |
| npm run test:routes | 18/18, producción local puerto 3002, sin sesión ni escrituras remotas |

Se corrigió una anotación string[] en el test SQL tras el primer typecheck. La comprobación final pasó. Aviso heredado de instalación: ESLint 9.39.5 fuera de soporte; no se alteró el stack para esta fase.

85 pruebas añadidas: 22 de contrato SQL, más selectores, parsers, RPC, acciones, permisos y rutas server-side. PostgreSQL real en memoria con PGlite; únicamente la frontera Auth y los datos de membresía/estados no expuestos por esta fase usan fixtures locales. Los casos incluyen tres plazas 1/3→2/3→3/3, rechazo del cuarto y conservación del Curro, no duplicar asignaciones ni slot, rejected/withdrawn/invited, Curro iniciado/cancelado, cambios de disponibilidad/especialidad, intereses solapados permitidos y assignment incompatible rechazado, liberación de slots y notificaciones reales. Pruebas previas de 2.1–2.3.2 siguen pasando con sus expectativas adaptadas al nuevo snapshot y vocabulario.

Dos gestores leen la última plaza libre; el primero selecciona y el segundo recibe rechazo al usar su estado anterior. Se comprueban locks y constraints originales. **PGlite usa una conexión: no se ha simulado concurrencia distribuida ni dos transacciones realmente paralelas.**

## QA visual aislada

`npm run qa:ui`, `/selection.html`: componentes reales con Server Actions simuladas, sin Supabase y con CSP que limita conexiones al servidor local. Verificados escritorio 1280×900 y móvil 390×844, candidaturas applied/selected/rejected/withdrawn/invited, plazas llenas sin Seleccionar pero con Descartar, staff solo lectura, estados del profesional, pending con ambos botones disabled y error conocido con enlace para actualizar. Sin overflow horizontal (scrollWidth=clientWidth: 1265 escritorio, 375 móvil; diferencia por scrollbar). Sin errores ni warnings de consola observados. No se hicieron selecciones reales desde navegador ni se usaron cuentas remotas.

## Límites y siguiente prueba autorizada

- Snapshot limitado a 200 jobs, 500 applications y 500 assignments. Si llega al límite de candidaturas se avisa de consulta parcial; no hay paginación ni historial exhaustivo. La ocupación sigue siendo el agregado del backend.
- No realtime: otras sesiones deben actualizar. Revalidar rutas no entrega notificaciones en vivo a otro navegador.
- No hay detalle de especialidad actual, experiencia o rating del profesional en este subconjunto; no se finge disponer de ellos.
- Auth de PGlite es simulado; falta prueba autenticada de extremo a extremo con Supabase y concurrencia real. El análisis de secretos por patrones no garantiza ausencia absoluta.
- No se implementan condiciones, documentos, contratación, confirmación, check-in, turnos, pagos, chat, incidencias, reviews, ranking ni transiciones posteriores de assignments. Los documentos legales siguen pendientes.

Antes del merge, en un entorno de prueba autorizado: owner publica Curro de dos plazas; tres workers con disponibilidad válida envían interés; manager selecciona A y B, verifica 2/2 y el rechazo al intentar C desde una segunda pestaña que conserve estado antiguo. Staff solo consulta; negocio ajeno y worker no pueden ejecutar select/reject. Comprueba double submit, cambio OFF antes de seleccionar, dos intereses solapados y bloqueo después del primer assignment. Descarta C, verifica «No seleccionado» y notificación en su sesión; A/B ven «Seleccionado» y assignment. No avanzar a condiciones, operativa o pagos.

V9.4.8 y todo prototype/ permanecen intactos. SHA-256 de ambas copias HTML: `2fb8548b43577ac113380bbcd7b21aae49edaba62cc03f20f05ce960277180ea`. Ningún archivo previo eliminado. La entrega es `business-candidate-selection.patch`, un único commit aplicable con git am sobre el main de partida.
