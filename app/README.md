# Curro & Parné — base del MVP

Aplicación web de hostelería para el piloto de Málaga. Esta fase implementa Auth SSR, onboarding, disponibilidad del profesional, publicación de Curros por negocios e interés del profesional; no procesa pagos y no importa datos del prototipo.

## Stack

| Paquete                       | Versión fijada |
| ----------------------------- | -------------- |
| Next.js / eslint-config-next  | 16.3.4         |
| React / React DOM             | 19.3.0         |
| TypeScript                    | 6.0.3, strict  |
| Tailwind CSS / PostCSS plugin | 4.3.3          |
| @supabase/supabase-js         | 2.116.0        |
| @supabase/ssr                 | 0.12.7         |
| Zod                           | 4.6.2          |
| ESLint                        | 9.39.5         |
| Vitest / Vite (solo QA)       | 5.0.0 / 8.3.0  |

Node.js: 22.12+ en la rama 22 o una LTS posterior compatible. El lockfile fija también las dependencias transitivas. TypeScript 7 se descartó porque typescript-eslint todavía no admite su API. ESLint 10 se descartó porque los plugins React/import/accesibilidad de la configuración actual de Next declaran compatibilidad hasta ESLint 9. No se fuerzan peers ni se desactivan reglas para evitar esos errores. **ESLint 9 aparece deprecado por fin de soporte**: revisar su actualización cuando la configuración de Next y sus plugins soporten ESLint 10. Es una limitación de herramientas de desarrollo, no una dependencia del servidor de producción.

## Instalación

Desde esta carpeta:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

En PowerShell: `Copy-Item .env.example .env.local`. Abrir `http://localhost:3000` y usar siempre ese mismo origen durante los flujos PKCE; no alternar localhost y 127.0.0.1.

| Variable                             | Uso                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL             | URL HTTPS del proyecto existente `crqpjcrpuflufzxiwdfb`                                |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key `sb_publishable_…`; nunca claves privilegiadas                         |
| APP_ORIGIN                           | Solo servidor; `http://localhost:3000` en desarrollo, origen HTTPS propio al desplegar |

La configuración rechaza una clave que no tenga el prefijo de publishable. No se almacena ninguna clave real en `.env.example`. Sin configuración las páginas públicas se pueden compilar y muestran un error comprensible al intentar Auth.

## Auth y correos

- Registro por correo/contraseña, confirmación de contraseña; no se envía rol ni `user_metadata`.
- `/auth/callback` intercambia el código PKCE y elimina los parámetros antes de redirigir. El enlace debe abrirse en el navegador donde se inició el flujo.
- `/auth/confirm` admite `token_hash` de tipo email/signup/recovery para plantillas SSR. Rechaza otros tipos y destinos externos.
- Login mediante Server Action, logout local y recuperación con destino `/actualizar-password`.
- Cambio de contraseña exige usuario confirmado. Tras actualizar se revocan las sesiones de refresh globalmente y se vuelve al login. Un access token ya emitido puede seguir siendo válido hasta su caducidad.
- Proxy llama `getClaims()` para verificar/refrescar cookies; el servidor valida identidad con `getUser()` y correo confirmado. Nunca se usa `getSession()` como prueba de autorización.
- Server Components, Server Actions y Route Handlers comparten el adaptador de cookies. El cliente browser está separado para futuros componentes que lo necesiten; estas operaciones se ejecutan en servidor.
- Las respuestas dependientes de sesión llevan `private, no-store`; `React.cache` solo deduplica dentro de la petición, no entre usuarios.

**Configuración externa pendiente de comprobar con una cuenta de prueba autorizada:** en Supabase Auth, Site URL y Redirect URLs deben incluir el origen de la app y `/auth/callback` (también el destino de recovery con su query). Las plantillas estándar de Supabase pueden utilizar el flujo PKCE. Si se adoptan plantillas `token_hash`, usar el origen exacto de la app en `/auth/confirm?token_hash={{ .TokenHash }}&type=email` para confirmación y `type=recovery` para recuperación. No cambiar plantillas ni configuración remota automáticamente. Verificar entrega real y límites de correo antes del piloto.

## Onboarding y datos reales

1. El servidor consulta el perfil propio bajo RLS. Sin perfil envía a `/onboarding` antes de pedir snapshot; el backend no permite snapshot sin perfil.
2. Profesional: nombre y una especialidad válida. Negocio: nombre personal sin especialidad.
3. Ambas casillas son explícitas y obligatorias. Se vuelven a comprobar las versiones vigentes antes de invocar **`cp_onboard`**, que registra perfil y aceptaciones atómicamente. No hay inserts manuales de aceptaciones.
4. Negocio sin pertenencias: **`cp_command('create_business', …)`**. Primer local: **`cp_command('create_venue', …)`**, Málaga y coordenadas omitidas (nulas).
5. `cp_command('snapshot', {})` se centraliza en `features/snapshot/server.ts`; Zod valida la parte del resultado necesaria en esta fase. La home muestra datos reales o estados vacíos.

Los formularios y Server Actions validan con Zod. Los roles proceden de `cp_profiles`; crear local requiere pertenencia activa owner/manager obtenida del snapshot. El backend conserva la última palabra. Un staff sin local llega a una home explicativa, sin bucle ni permiso de creación. Las comprobaciones de perfil existente/local existente reducen reenvíos, pero no sustituyen idempotencia transaccional ante peticiones concurrentes.

## Rutas

| Ruta                                                               | Acceso                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| /, /login, /registro, /recuperar-password                          | Público                                                       |
| /confirmar-correo, /auth/error, /legal/terminos, /legal/privacidad | Público informativo                                           |
| /onboarding                                                        | Usuario confirmado sin perfil                                 |
| /actualizar-password                                               | Usuario confirmado; también sin perfil por ser parte de Auth  |
| /inicio                                                            | Perfil creado; negocio incompleto continúa su configuración   |
| /negocio/nuevo, /negocio/local/nuevo                               | Perfil Negocio; permiso de gestión adicional para crear local |

`/disponibilidad` es exclusiva de Profesional. La página y sus acciones usan `requireProfile('worker')` y rechazan Negocio. Las páginas y las acciones comprueban autorización en servidor, además del Proxy.

## Organización

```text
app/
├── src/
│   ├── app/                 # (public), (auth), (app), auth handlers
│   ├── components/          # ui y layout
│   ├── features/            # auth, onboarding, businesses, venues, availability, jobs, snapshot
│   ├── lib/                # supabase, validation, utils
│   ├── types/database.ts   # reexport del archivo generado del repositorio
│   └── proxy.ts
├── scripts/                # smoke HTTP, seguridad y QA visual aislado
├── tests/                  # validación, RPC, Auth, autorización y fixture visual
├── .env.example
├── package.json
└── package-lock.json
```

No se crean carpetas vacías para funcionalidades futuras. No hay auth helpers deprecados ni Pages Router. Los errores de SDK/SQL se convierten a mensajes en castellano. Los logs propios contienen contexto y código saneado, sin payload, sesiones, tokens ni stack traces. Los proxies externos de un futuro despliegue también deben omitir/redactar los parámetros sensibles de los callbacks en sus logs.

## Validación

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:security
npm start
```

En otra terminal: `npm run test:routes`. Para QA de onboarding/loading/disabled/errores sin backend: `npm run qa:ui` y abrir `http://127.0.0.1:3001`. La página está marcada QA AISLADO, usa componentes reales y acciones simuladas, no carga `.env.local`, prohíbe importar Supabase y no es una ruta Next ni se publica. Las pruebas y el fixture no verifican entrega de correos, sesión real ni escrituras RPC extremo a extremo.

Consultar [QA.md](QA.md) para evidencia y límites. No hacer merge sin revisión humana.

## Documentos legales — pendiente antes de producción

Los textos completos no existen todavía. Las acciones «Ver Términos de uso» y «Ver Política de privacidad» muestran **«Documento legal pendiente de revisión»**; no presentan textos genéricos como documentos válidos. Se conservan `status = draft` y `production_ready = false` en remoto, sin cambios de esquema. El onboarding de piloto registra las aceptaciones mediante la RPC existente según el alcance expresamente autorizado. Si las políticas dejan de ser borrador, esta UI falla de forma cerrada hasta incorporar los documentos definitivos.

- [ ] Redactar los textos definitivos de términos y privacidad.
- [ ] Obtener revisión por asesoría jurídica.
- [ ] Asignar versión definitiva y publicar el contenido accesible.
- [ ] Guardar hash SHA-256 del contenido definitivo.
- [ ] Marcar `status = approved` tras revisión.
- [ ] Marcar `production_ready = true` tras revisión.
- [ ] Actualizar la UI y probar que la aceptación corresponde al contenido/versionado mostrado.

Supabase remoto, los 17 SQL originales, los tipos generados y V9.4.8 se conservan. GitHub Pages sirve solo el prototipo; desplegar esta app requiere un servidor compatible con Next SSR, fuera del alcance de esta fase.

## Fase 2.1 — Disponibilidad profesional

Desde Inicio, «Gestionar disponibilidad» abre `/disponibilidad`. La Fase 2.3.1 separa el interruptor «Disponible para Curros» de «Mi disponibilidad» (franjas). Muestra la marca real del perfil y las franjas propias ordenadas cronológicamente, permite añadir inicio/fin y eliminar una franja propia. Las mutaciones usan exclusivamente `cp_command('availability', ...)`; el snapshot se valida con Zod. Las acciones verifican rol y pertenencia en servidor, y el backend conserva la autorización definitiva.

Las horas se introducen y muestran en `Europe/Madrid`, independientemente de la zona del dispositivo. Se rechazan campos vacíos, fin anterior o igual al inicio, horas inexistentes o ambiguas del cambio de horario y duraciones superiores a 31 días. El backend limita a 100 franjas. No se impide guardar franjas pasadas ni solapadas, de acuerdo con el contrato existente.

Crear o eliminar franjas conserva el interruptor. La Fase 2.3.2 desacopla las franjas del interruptor mediante la migración `20260914202422_decouple_worker_availability_status.sql`, aplicada y verificada en Supabase.

QA de esta fase: `npm ci`, lint, typecheck, 79 pruebas en 8 archivos, build y test:security completados correctamente. El análisis de patrones no detectó secretos y confirmó que `.env.local` está ignorado; no prueba ausencia absoluta de secretos. Las pruebas de creación y eliminación usan dobles de la RPC: no se realizaron escrituras ni pruebas autenticadas de extremo a extremo contra Supabase remoto. Sigue pendiente verificar el flujo real con una cuenta de prueba antes del piloto. Se conserva la limitación de ESLint 9 descrita arriba.

## Fase 2.2 — Publicación de Curros

Desde Inicio de Negocio, «Publicar Curro» abre `/negocio/curros/nuevo`. Solo perfiles business y pertenencias activas owner/manager pueden publicar. La página muestra un estado explicativo si faltan permisos o locales activos; la acción valida nuevamente el negocio, el local y su relación utilizando el snapshot de la petición. El snapshot remoto solo incluye pertenencias activas; la RPC vuelve a comprobar los permisos en la transacción. Staff puede consultar los Curros de sus negocios, pero no publicarlos.

La feature `src/features/jobs/` separa validación, permisos/listado, comando, acción y componentes. Inicio muestra los Curros de negocios con pertenencia activa: publicados aún vigentes por inicio ascendente, después el historial por inicio descendente. El backend devuelve como máximo 200; no hay paginación. Las fases siguientes incorporan candidaturas y el subconjunto necesario de asignaciones descrito más abajo.

La publicación usa exclusivamente `cp_command('publish', ...)`. No se envían `location`, identidad ni roles desde el formulario. El local determina la ubicación en backend. La remuneración admite coma o punto decimal, nunca separadores de miles, exponentes ni más de dos decimales. Se convierte por partes enteras a `pay_cents`, sin redondear; rango 0,01–100.000 € conforme al límite del backend. No calcula comisiones. Las fechas reutilizan `madridInstant` de disponibilidad: Europe/Madrid, rechazo de horas ambiguas/inexistentes, inicio futuro y duración real máxima de 18 horas. Título 3–120, descripción hasta 2000 y plazas 1–20.

Los envíos muestran «Publicando…» y deshabilitan el botón. Tras éxito se revalida Inicio y se redirige con aviso. No hay reintentos automáticos: si se pierde la respuesta, se pide revisar Inicio antes de reenviar porque la RPC existente no aporta clave de idempotencia. El backend limita a 50 publicaciones por negocio en 24 horas. No se han modificado estas reglas ni creado publicaciones remotas.

Para revisar la UI sin escribir en Supabase: `npm run qa:ui` y abrir `http://127.0.0.1:3001/jobs.html`. El fixture usa el formulario y listado reales con datos sintéticos y una acción simulada; el servidor de QA bloquea imports de Supabase y no carga `.env.local`. No es una ruta de producción.

Consultar [QA-business-job-publishing.md](QA-business-job-publishing.md) para la validación histórica de publicación. Las candidaturas y la selección se incorporan en las fases 2.3 y 2.4; edición, cancelación y operativa posterior del turno no se implementan aquí.

## Fase 2.3 — Curros disponibles e interés

El acceso «Ver Curros» de Inicio del profesional abre `/curros`, protegida con `requireProfile('worker')`. El servidor obtiene el snapshot real y muestra una tarjeta por Curro publicado, de la misma especialidad y con inicio futuro. Se utiliza inicio futuro porque el backend deja de admitir candidaturas al comenzar el turno. Urgente es una señal visual, sin cambiar el orden cronológico ni la compatibilidad.

El snapshot incluye `business_name` en jobs y la candidatura propia para cada tarjeta del profesional. La Fase 2.4 amplía los campos necesarios de applications y assignments. No se incorporan reviews ni una bandeja de notificaciones. La UI muestra orientación simple de cobertura; `apply` conserva la autoridad sobre disponibilidad, capacidad y solapes.

«Me interesa» usa una Server Action y exclusivamente `cp_command('apply', {job_id})`. Valida UUID, perfil worker, visibilidad del Curro y candidatura existente antes de llamar al backend. La autoridad definitiva es la RPC. Respuestas normales y `{id, unchanged: true}` se consideran éxito; se revalidan `/curros` e `/inicio` y se redirige con confirmación. No hay reintentos automáticos, y una respuesta ambigua pide recargar antes de repetir.

Los estados actuales son «Interés enviado», «Seleccionado», «No seleccionado» y «Candidatura retirada». Las candidaturas cerradas no permiten otro envío. Una invitación permite mostrar interés si el Curro sigue abierto; no se añade UI para invitar o retirar. Los Curros con candidatura propia permanecen visibles aunque hayan empezado o se hayan cancelado, siempre que estén incluidos en el snapshot. No constituye un historial paginado completo.

Fechas en Europe/Madrid y céntimos a euros reutilizan las utilidades anteriores. Para QA aislada: `npm run qa:ui` y `http://127.0.0.1:3001/interest.html`. Usa componentes reales, datos sintéticos y respuestas simuladas, sin Supabase. Véase [QA-worker-job-interest.md](QA-worker-job-interest.md).

El snapshot existente limita jobs a 200 y applications a 500; no se añade paginación. Si una candidatura antigua quedara fuera de ese límite, la RPC seguirá impidiendo duplicados, pero el estado previo puede no estar visible. La prueba real previa al merge de la Fase 2.4 debe incluir selección y rechazo, sin operativa posterior ni pagos.

## Fase 2.3.1 — Estado y horarios separados

«Disponible para Curros» es la intención ON/OFF del perfil. «Mi disponibilidad» son los horarios guardados. Desactivar usa exclusivamente `cp_command('profile')` y no elimina ni modifica franjas. El nombre y la biografía que exige esa RPC se toman del perfil leído en servidor mediante `requireProfile('worker')`; nunca de campos del formulario. No se añade bio al snapshot ni se envía al cliente.

El interruptor muestra el estado confirmado, se deshabilita al guardar y evita cambios optimistas. Si una respuesta no puede confirmarse, muestra un error y «Comprobar estado» sin afirmar ON/OFF. ON sin franjas y OFF con horarios tienen avisos explícitos. Inicio muestra ese mismo estado, la franja en curso o próxima, accesos a «Gestionar disponibilidad» y «Ver Curros», y un bloque Actividad informativo sin funcionalidad.

En Curros se verifica únicamente si una franja propia contiene todo el turno, siguiendo el criterio simple del backend (no se unen franjas contiguas). Si falta cobertura o el perfil está OFF, se muestra «Ajustar disponibilidad» en lugar de permitir un envío que sabemos que será rechazado. La cobertura no garantiza plazas ni ausencia de solapes: apply sigue siendo autoridad final. «Interés enviado» tiene prioridad sobre estos avisos y permanece deshabilitado.

**Fase 2.3.2:** guardar una franja realiza una sola RPC availability; el interruptor usa explícitamente profile. La migración `20260914202422_decouple_worker_availability_status.sql` elimina únicamente la activación automática de la función privada. La migración ya fue aplicada y verificada en Supabase. Las pruebas autenticadas confirmaron que crear o eliminar franjas no modifica el interruptor «Disponible para Curros». El historial sincronizado de 17 migraciones y su manifiesto permanecen intactos. Las respuestas de creación inciertas requieren revisar las franjas antes de repetir, sin reintentos automáticos.

Las pruebas SQL usan PGlite 0.5.8 (dependencia de desarrollo): reproducen las 17 migraciones originales y la nueva migración en PostgreSQL en memoria. Solo auth.users/auth.uid/auth.jwt y los roles de plataforma se simulan localmente; no hay conexión ni credenciales remotas. Esto no sustituye una prueba autenticada contra Supabase después del despliegue autorizado. Persisten posibles conflictos de última escritura entre pestañas al editar nombre/bio/estado, pues profile reemplaza esos campos.

Para QA visual sin backend: `npm run qa:ui`, abrir `/polish.html` para disponibilidad o `/selection.html` para candidaturas. La evidencia histórica de la Fase 2.3.1 se conserva en [QA-worker-availability-polish.md](QA-worker-availability-polish.md); su compensación de dos RPC queda sustituida por la Fase 2.3.2, ya integrada en main.

## Fase 2.4 — Candidaturas y selección

Desde cada Curro propio, «Ver candidaturas» abre `/negocio/curros/[jobId]/candidaturas`. El servidor exige perfil business y pertenencia al negocio. Owner/manager pueden seleccionar una candidatura applied o descartar applied/invited; staff solo consulta. Orden por fecha de candidatura ascendente e id, sin ranking. Se muestra el nombre disponible en el snapshot; la especialidad se etiqueta como especialidad del Curro, porque el snapshot no incluye la especialidad actual del candidato. No se infieren experiencia, referencias ni rating.

Las mutaciones usan exclusivamente `cp_command('select'|'reject', {application_id})`. El backend crea la asignación y asigna slot_no; el frontend nunca escribe tablas ni decide el número de plaza. La ocupación usa `jobs.occupied`, calculado por el backend excluyendo cancelled/no_show/replaced. Al llenarse se bloquea seleccionar, pero las candidaturas siguen visibles y se pueden descartar según su estado.

Zod exige `occupied`, `business_id`, `worker_name`, `created_at` y assignments mínimos (`id`, `application_id`, `job_id`, `worker_id`, `state`), sin valores por defecto que oculten datos ausentes. Una selección histórica con asignación liberada se identifica como tal; si no aparece la asignación, se pide comprobarla, sin afirmar una plaza activa. No se añaden RPC ni datos al backend: se valida un subconjunto del snapshot existente.

Los triggers existentes generan notificaciones de selección/rechazo y se verifican en SQL. El estado visible se deriva de applications; no se añade bandeja, envío externo ni marcado de lectura. Inicio remite a Ver Curros para consultar actividad, sin módulo operativo nuevo. La selección revalida Inicio, Curros y candidaturas. Sin realtime: otras sesiones deben actualizar. Los errores conocidos se traducen; ante resultado ambiguo no hay reintento automático ni confirmación inventada.

No hay nuevas migraciones, dependencias, variables ni modificaciones remotas. Validación y límites: [QA-business-candidate-selection.md](QA-business-candidate-selection.md). No se implementan condiciones, documentación, confirmación, turnos, pagos ni otras transiciones de assignments.

## Fase 2.4.1 — Navegación y estados

Los estados de candidaturas se presentan como badges semánticos de texto, sin botones disabled: interés enviado en cobre, seleccionado en verde y resultados cerrados en neutro. Inicio agrupa Ver Curros y Gestionar disponibilidad dentro de la tarjeta principal; Actividad mantiene menor peso. BackLink unifica «Volver a Inicio» y RefreshLink ofrece «Actualizar» conservando la lectura completa de servidor. Curros y Disponibilidad presentan accesos contextuales independientes del texto. No cambia ninguna regla ni comando backend. QA visual aislada: `npm run qa:ui`, `/ux.html`. Resultados: [QA-business-candidate-selection-ux-polish.md](QA-business-candidate-selection-ux-polish.md).
