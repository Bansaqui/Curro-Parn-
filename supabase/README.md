# Supabase — historial remoto sincronizado

Proyecto existente: `crqpjcrpuflufzxiwdfb` (Curro & Parné). Verificado el 11 de septiembre de 2026.

## Contenido y procedencia

- `migrations/`: las 17 migraciones del historial remoto, con versiones y nombres originales. Cada registro contiene una sentencia completa; se ha guardado exactamente en UTF-8, sin añadir comentarios, separadores ni saltos de línea.
- `database.types.ts`: salida original del generador de tipos de Supabase para el esquema `public`. Se ha comparado con una generación actual y es idéntica. No contiene los tipos de los esquemas internos ni sustituye el SQL.
- `sync-manifest.json`: origen, versiones, nombres y SHA-256 de cada archivo; incluye la huella del array de sentencias devuelta por el remoto.
- `functions/.gitkeep`: reserva existente, sin cambios. No se han recuperado ni desplegado Edge Functions en esta tarea.

## Migraciones recuperadas

- `20260909134518_curro_parne_pilot_core.sql`
- `20260909135440_curro_parne_workflow_aliases_and_internal_policies.sql`
- `20260909224116_add_events_actor_index.sql`
- `20260909225043_business_entities_venues_and_membership.sql`
- `20260909225105_index_venues_created_by.sql`
- `20260909225214_notifications_and_incident_taxonomy.sql`
- `20260909225255_index_notification_foreign_keys.sql`
- `20260909230411_auth_onboarding_policy_acceptance_and_safe_defaults.sql`
- `20260909230605_atomic_onboarding_and_policy_index.sql`
- `20260909230634_fix_onboarding_auth_boundary.sql`
- `20260909230727_harden_command_facade_and_snapshot.sql`
- `20260909230907_restore_private_command_internal_delegate.sql`
- `20260909230928_fix_snapshot_alias_collisions.sql`
- `20260909230942_fix_snapshot_job_venue_alias_collision.sql`
- `20260909231024_assignment_released_states_and_overlap_invariants.sql`
- `20260909231129_review_targets_business_or_worker.sql`
- `20260909231152_finish_review_command_target_migration.sql`

## Recuperación y verificación

La exportación procede de una consulta SELECT a `supabase_migrations.schema_migrations`, seleccionando exclusivamente `version`, `name`, `statements` y su huella. No se exportaron usuarios, registros de negocio, credenciales ni metadatos de autores. No se ejecutó el SQL recuperado.

Para futuras sincronizaciones, comparar primero el listado remoto con los archivos y el manifiesto. Recuperar las sentencias originales de las versiones ausentes mediante una consulta de lectura o la función de consulta de migraciones de Supabase. Si cambia una migración ya guardada, detenerse y revisar la discrepancia; no sobrescribirla automáticamente. Generar tipos desde el proyecto indicado y comprobar diferencias antes de reemplazar el archivo. No usar `db pull`, `migration repair`, `db push` ni `db reset` para esta recuperación: no es necesario alterar el esquema ni el historial remoto.

Los archivos SQL son históricos: pueden contener ALTER, DROP de funciones, políticas o restricciones y actualizaciones que ya se ejecutaron en su momento. Conservarlos no significa volver a aplicarlos. En esta sincronización no se ha ejecutado ninguna migración ni modificado datos remotos.

## Alcance de reproducibilidad

GitHub no contenía archivos SQL y Supabase tenía 17 migraciones. Ahora el historial guardado coincide en nombres, versiones y contenido con el remoto. Los tipos actuales también coinciden con la exportación anterior.

Se ha recuperado el historial de la aplicación; no es un backup completo de Supabase ni de los datos. Auth, extensiones y esquemas administrados son dependencias del entorno Supabase. No había `config.toml` local que preservar y no se ha inventado una configuración remota. La reproducción desde cero en una instancia aislada no se ha ejecutado; no se afirma que se hayan descartado todos los cambios manuales ajenos al historial.

## Seguridad

No guardar claves service_role, sb_secret, JWT secrets, contraseñas, tokens personales ni URLs con credenciales. Las referencias al rol PostgreSQL `service_role` dentro del SQL son identificadores de permisos, no claves. El futuro frontend solo podrá usar una publishable key; esta tarea no añade ninguna clave ni archivo .env.

Documentación oficial:
- https://supabase.com/docs/reference/api/v1-get-a-migration
- https://supabase.com/docs/guides/api/rest/generating-types
