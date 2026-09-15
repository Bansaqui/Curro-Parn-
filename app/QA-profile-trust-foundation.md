# Fase 2.5A — Perfil profesional y confianza

Base: `origin/main` `9d3a097` (PR #7 integrado). Rama: `feat/profile-trust-foundation`.

## Contrato y esquema

Migración local: `supabase/migrations/20260915161149_professional_profile_trust_foundation.sql`.
Creada con `supabase migration new professional_profile_trust_foundation`, CLI oficial 2.83.0. La 2.117.0 no pudo arrancar por ACL del directorio local de configuración; no se inventó el timestamp ni se cambió configuración remota.

- `cp_worker_specialties`: clave profesional/especialidad, vocabulario idéntico al existente, índice único parcial y constraint trigger para exactamente una principal si la lista no está vacía. La API pide al menos una. Reemplazo atómico, serializado mediante bloqueo del perfil; comprobación inmediata antes de devolver el comando.
- Backfill de `cp_profiles.specialty` para profesionales existentes; trigger privado inicializa nuevos perfiles durante onboarding. Valida `auth.uid() = new.id`. No admite aprovisionamiento administrativo de perfiles sin identidad de usuario; cualquier futura importación deberá revisarse explícitamente.
- `cp_worker_skills`: ocho valores canónicos, sin etiquetas arbitrarias: Sala, Barra, Bandeja, TPV, Terraza, Eventos, Barista, Coctelería.
- `cp_worker_experience`: negocio y función (2–100 caracteres), fechas reales sin futuro y fin >= inicio, descripción opcional <=600, timestamps, máximo 30 entradas por profesional. Fecha de fin nula indica continuidad.
- `verification_status` nace en `declared`. El trabajador solo puede modificar/eliminar sus entradas declaradas. El comando rechaza claves de verificación/identidad suministradas por el cliente. No existe acción de verificación.
- `cp_profiles.specialty`, disponibilidad, snapshot y reglas de matching/selección permanecen intactos. La UI explica que la especialidad principal nueva no cambia todavía la compatibilidad.

Comandos vía fachada existente `cp_command` → `cp_private.command` → función privada: `worker_profile`, `worker_profile_save`, `worker_experience_save`, `worker_experience_delete`. La definición existente se amplía únicamente con despacho; se preservan ACL, SECURITY DEFINER y search_path (comprobados en SQL local). No hay escrituras directas de tablas en frontend.

Tipos manuales inferidos con Zod en `src/features/profile/schema.ts`, siguiendo el patrón de contratos JSON del proyecto. No se presenta una generación remota falsa: `supabase/database.types.ts` y `sync-manifest.json` quedan intactos. Tras desplegar, regenerar el export oficial y comparar el contrato.

## Privacidad

RLS habilitada en las tres tablas, sin políticas abiertas y con privilegios directos revocados. Ni siquiera el propietario puede consultarlas directamente por Data API. Los comandos comprueban usuario confirmado/no bloqueado y rol; el guard SSR es una defensa adicional, no la autoridad definitiva. No se usa user_metadata.

El profesional solo consulta su propio perfil. El negocio presenta un application_id: backend exige pertenencia activa al negocio del Curro y evento real `apply` de ese profesional para esa candidatura. Owner/manager/staff pueden leer; selección y rechazo conservan sus permisos previos. Invitación sola no autoriza. No se devuelve worker_id, correo, teléfono ni identidad Auth; los identificadores de experiencia se omiten (null) para negocios. Texto libre declarado podría contener datos personales introducidos por el usuario: se advierte que no los incluya; no se promete un filtro automático de PII.

El acceso se conserva mientras exista la candidatura genuina y la pertenencia siga activa, incluso si fue rechazada/retirada. No es un directorio público. Una candidatura sin evento histórico comprobable se deniega por seguridad. El enlace puede terminar en 404 en ese caso o tras perder permisos; el backend no concede acceso por la mera presencia del enlace.

“Experiencia declarada” significa aportada por el profesional, sin evidencia documental validada. “Nuevo en Curro & Parné” significa que no constan asignaciones `closed`; no significa que carezca de experiencia fuera de la plataforma. No hay verificación legal, documentos, IA, CV, ratings, favoritos ni pagos. Los documentos legales anteriores permanecen en borrador pendiente, sin cambios.

## QA local

- Suite completa: 432/432 pruebas en 22 archivos; incluye las 367 anteriores y 65 nuevas.
- SQL real ejecutado en PGlite local: backfill, onboarding, principal único, CRUD, límites/fechas/tipos, manipulación de identidad y verificación, privacidad de invitaciones, negocio ajeno/inactivo, staff, RLS/privilegios y conservación de ACL.
- Lint y typecheck: exit 0.
- `npm run build`: exit 0; ambas rutas nuevas dinámicas.
- `npm run test:security`: sin secretos de alta confianza detectados en archivos versionables y bundles públicos; `.env.local` ignorado. El escaneo por patrones no demuestra ausencia absoluta.
- `npm run test:routes`: 20/20, servidor Next de producción local en 3003, sin sesión; incluye las dos rutas nuevas y redirección no-store a login.
- Navegador con componentes reales y Server Actions simuladas en fixture aislada: 390×844 y 1280×900; sin desbordamiento horizontal a 390, objetivos táctiles >=44 px (checkbox mediante su etiqueta), edición desplegable con valores, confirmación de eliminación, botón pendiente/deshabilitado, error en español, vacío y negocio de solo lectura. Sin errores/warnings de consola. No son pruebas autenticadas contra Supabase remoto.
- V9.4.8 current e histórico: SHA-256 `2fb8548b43577ac113380bbcd7b21aae49edaba62cc03f20f05ce960277180ea`. Sin cambios en prototipos ni migraciones anteriores.

## Despliegue pendiente y límites

**No aplicar el frontend de esta fase contra una base sin esta migración.** Revisar y desplegar primero en Supabase de staging, regenerar tipos, después probar con cuentas auténticas worker/owner/manager/staff y dos negocios distintos. Verificar JWT/PostgREST reales, configuración de zona horaria (fechas comparadas con current_date) y nueva alta de usuario. Solo entonces autorizar producción. No se aplicó ninguna migración remota ni se escribieron datos remotos durante esta fase.

Las pruebas PGlite ejecutan PostgreSQL y roles locales, pero no sustituyen PostgREST real ni una prueba de concurrencia multi-conexión. Las mutaciones no reintentan automáticamente respuestas ambiguas: redirigen para releer lo guardado antes de repetir una creación. No hay paginación del perfil: límite intencional de 30 experiencias; los límites previos del snapshot pueden impedir enlazar candidaturas muy antiguas.

Rollback: retirar primero las rutas/enlaces del frontend mediante una versión anterior. Mantener las tablas nuevas y sus datos, evitando DROP/DELETE o modificación de especialidad legacy. Si hiciera falta retirar backend, preparar otra migración forward-only revisada que quite el despacho y el trigger de inicialización, conservando datos y ACL originales; no ejecutar una reversión destructiva automática. La nueva migración solo añade tablas/funciones/triggers y hace backfill, no resetea ni recrea esquema existente.

No push ni merge. Entrega mediante un único commit incremental y `git format-patch -1`.
