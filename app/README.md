# Curro & Parné — base del MVP

Aplicación web de hostelería para el piloto de Málaga. Esta fase implementa Auth SSR y onboarding; no publica Curros, no procesa pagos y no importa datos del prototipo.

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

No existen aún pantallas exclusivas de Profesional. El guard `requireProfile('worker')` está preparado y probado para rechazar Negocio cuando se añadan. Las páginas y las acciones comprueban autorización en servidor, además del Proxy.

## Organización

```text
app/
├── src/
│   ├── app/                 # (public), (auth), (app), auth handlers
│   ├── components/          # ui y layout
│   ├── features/            # auth, onboarding, businesses, venues, snapshot
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
