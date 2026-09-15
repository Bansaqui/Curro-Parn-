# QA — Fase 2.4.1: pulido de navegación y estados

Rama existente feat/business-candidate-selection, base `0cb4afdd6100f699951f752f094f249f6d4ebd86`. Cambio exclusivamente de presentación; sin push ni merge.

## Cambios

- StatusBadge usa span, sin role falso, cursor default ni interacción. Interés enviado, Seleccionado, No seleccionado y Candidatura retirada dejan de ser botones disabled. Candidatos usan el mismo patrón.
- Inicio sitúa Ver Curros (principal) y Gestionar disponibilidad (secundaria) dentro de la tarjeta de disponibilidad, con Actividad de menor peso.
- BackLink ofrece Volver a Inicio en Curros, Disponibilidad y Candidaturas, con área táctil mínima de 44 px.
- Curros disponibles tiene CTA Gestionar disponibilidad separada del texto. Disponibilidad añade Ver Curros disponibles.
- RefreshLink muestra Actualizar con flecha de recarga. Conserva navegación completa y el requisito de releer estado después de un error; no altera la mutación.
- Plazas separa cubiertas y pendientes; lleno se presenta en verde. Seleccionar sigue siendo principal y Descartar tiene tratamiento sobrio secundario. Espaciado y jerarquía consistentes.
- Se reutiliza la clase secondary con variante clara dentro de home; se preserva su tratamiento oscuro de landing. Disabled real usa not-allowed; pending usa progress cuando hay spinner o formulario aria-busy.

## Validación

- npm ci no repetido: node_modules, package.json y lockfile no cambiaron.
- npm run lint: exit 0.
- npm run typecheck: exit 0.
- npm test: **367/367**, 19 archivos; 8 pruebas nuevas de semántica, ubicación de acciones y navegación. Selección, rechazo, interés y disponibilidad siguen pasando.
- npm run build: exit 0. Tras los últimos ajustes de espaciado/singular y datos de fixture, se repitió build/typecheck integrado; 50 pruebas focalizadas pasaron y el último cambio de fixture pasó lint.
- npm run test:security: exit 0, 175 archivos y 22 bundles revisados antes de añadir esta documentación; .env.local ignorado, sin secretos detectados por patrones.
- npm run test:routes: **18/18**, usando el servidor de producción local existente en 3002; sin sesión ni escrituras remotas.

## QA visual y accesibilidad

Servidor aislado existente en 3001, `/ux.html`, componentes reales con acciones simuladas. Revisadas las cuatro pantallas a 1280×900 y 390×844, applied/selected/rejected/withdrawn, plazas completas, pending select/reject y error con Actualizar. Sin overflow horizontal en cada pantalla. Controles de acción medidos de 44 px o más; botones se apilan en móvil y mantienen anchura natural en escritorio.

Hover real sobre Interés enviado, Seleccionado y No seleccionado confirmó cursor default. Durante selección ambos botones quedan disabled con cursor progress. Se comprobó foco de teclado visible en Actualizar. Badges conservan texto explícito, no dependen solo del color. Contraste calculado de texto/fondo: neutro 7,59:1, positivo 7,02:1, cobre 7,20:1; secundario 10,96:1 y principal 5,87:1. No equivale a una auditoría exhaustiva WCAG o con lector de pantalla.

La fixture inicial repetía ids de Curros al mostrar estados simultáneos; se corrigió solo el dato simulado. Una nueva sesión de navegador recorrió todas las pantallas y tamaños finales sin errores ni warnings de consola. Se reutilizó el servidor existente tras detectar el puerto ocupado, sin detener procesos del usuario.

## Conservación y límites

Diff revisado: sin cambios en comandos/actions, selectors funcionales, snapshot, aplicaciones/asignaciones del backend, matching, esquema, migraciones, RLS, Supabase remoto, dependencias o rutas nuevas. V9.4.8 y todo prototype/ permanecen intactos. Las únicas acciones de selección tocadas visualmente están en sus formularios, sin modificar su código de envío.

Persisten los límites documentados en 2.4: snapshot sin paginación, actualización manual entre sesiones y prueba autenticada real antes del merge. QA visual usa fixtures, no cuentas remotas. La revisión de secretos por patrones no demuestra ausencia absoluta. No se implementaron pagos, chat, notificaciones ni contratación.

Entrega incremental: `business-candidate-selection-ux-polish.patch`, para aplicar después del commit de Fase 2.4.
