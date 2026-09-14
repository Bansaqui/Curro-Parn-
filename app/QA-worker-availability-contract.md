# QA — Fase 2.3.2

Rama existente `feat/worker-job-interest`. Continúa `72e53944e023be87890d1577c8e53fb5c40e91bc`; no se hace push ni merge.

## Contrato y migración pendiente

`20260914200201_decouple_worker_availability_status.sql` elimina exclusivamente `update public.cp_profiles set available=true where id=u;` del bloque availability en `cp_private.command(text,jsonb)`. Usa la definición vigente, comprueba la posición y unicidad de la sentencia y aborta ante una definición inesperada. Conserva el resto del cuerpo, SECURITY DEFINER, search_path vacío, propietario y ACL. No altera RLS, grants, datos ni otras funciones. Supabase CLI no estaba disponible; el nombre usa la convención del repositorio y la hora UTC real.

La migración se ejecutó únicamente en PostgreSQL en memoria (PGlite 0.5.8), nunca en Supabase remoto. **Desplegarla de forma autorizada antes de desplegar este frontend.** El manifiesto y los 17 SQL históricos siguen representando el último historial remoto sincronizado.

Guardar una franja usa una sola mutación availability. El interruptor usa profile explícitamente. Se elimina la restauración OFF y su aviso; una respuesta de inserción perdida sigue pidiendo revisar las franjas sin repetir automáticamente.

## Validación

- npm ci: exit 0. Verificación final del lockfile: 404 paquetes instalados, 405 auditados, 0 vulnerabilidades. Se repitió únicamente la instalación tras conservar las entradas opcionales multiplataforma que npm había retirado al añadir la dependencia en Windows. Aviso heredado: ESLint 9.39.5 fuera de soporte.
- npm run lint: exit 0.
- npm run typecheck: exit 0.
- npm test: **274/274**, 15 archivos. Incluye 16 pruebas SQL reales y la actualización de los tests de la compensación eliminada.
- npm run build: exit 0, Next.js 16.3.4.
- npm run test:security: exit 0; 154 archivos y 21 bundles analizados, sin secretos de alta confianza detectados; `.env.local` ignorado. El análisis por patrones no garantiza ausencia absoluta.
- npm run test:routes: exit 0, **17/17** rutas sin sesión contra el servidor de producción local en el puerto 3002, sin escrituras remotas.
- Diff revisado; ninguna versión histórica ni archivo anterior eliminado.

Las pruebas SQL reproducen los 17 SQL originales y luego la nueva migración. Verifican crear/borrar en ON/OFF, conservar todas las columnas de las franjas al cambiar el interruptor, rechazo sin sesión y de negocio, pertenencia del borrado, rango inválido, límite de 100, eventos, igualdad de políticas y atributos/ACL de funciones y sustitución exacta de una sola sentencia. Se ejecutan candidates y apply reales: OFF con cobertura queda excluido; ON con cobertura es válido; ON sin cobertura queda excluido. La preparación usa onboarding y comandos reales para los datos locales. No se usan credenciales service_role: el rol homónimo local es solo un objeto inerte requerido por los REVOKE históricos.

Los primeros ensayos focalizados corrigieron datos incompletos de la fixture de negocio/local antes de la pasada final. No requirieron cambiar ninguna regla del producto.

## Límites y prueba posterior

PGlite ejecuta PostgreSQL real, pero auth.users/auth.uid/auth.jwt son fixtures: no valida sesiones reales, infraestructura Supabase ni concurrencia distribuida. Sigue pendiente una prueba autenticada autorizada después de aplicar la migración: estando OFF crear y borrar franjas y comprobar que sigue OFF; activar, crear/borrar la última y comprobar ON; alternar el interruptor verificando horarios intactos; comprobar candidaturas con/sin cobertura. Verificar también dos pestañas: profile reemplaza nombre/bio/available y mantiene el riesgo preexistente de última escritura.

Supabase remoto no fue modificado. V9.4.8 y todo prototype/ siguen intactos; ambas copias HTML mantienen SHA-256 `2fb8548b43577ac113380bbcd7b21aae49edaba62cc03f20f05ce960277180ea`. Selección, assignments, pagos y las demás ampliaciones excluidas no se han desarrollado. Documentos legales continúan pendientes; no se cambian en esta fase.

La entrega es una serie mail acumulada de los dos commits posteriores a `dd867b88a8a709cd26e197df2842d89cdcfcf6f2`, aplicable con `git am`: `worker-availability-polish-fixed.patch`.
