# Curro & Parné

Prototipo de una plataforma que conecta negocios y profesionales para cubrir servicios y gestionar su actividad. Mercado inicial: **Málaga**.

**Estado: prototipo / pre-MVP. Versión funcional actual: V9.4.8.**

## Estructura

- `prototype/current/index.html`: versión funcional en pruebas.
- `prototype/versions/`: originales históricos inmutables y sus huellas SHA-256.
- `docs/producto/`: alcance y decisiones de producto.
- `docs/arquitectura/`: funcionamiento técnico y publicación.
- `docs/legal/`: espacio reservado para documentación legal revisada.
- `supabase/migrations/`: 17 migraciones originales recuperadas del proyecto remoto.
- `supabase/database.types.ts`: tipos generados del esquema público actual.
- `supabase/functions/`: carpeta existente reservada, sin cambios.
- `app/`: primera aplicación del MVP con Next.js, Auth SSR y onboarding.

## Abrir el prototipo

Abre `prototype/current/index.html` directamente en un navegador. Para probar con HTTP desde la raíz del repositorio:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Visita `http://127.0.0.1:8000/prototype/current/index.html`.

URL de GitHub Pages:
https://bansaqui.github.io/Curro-Parn-/prototype/current/index.html

El HTML contiene CSS y JavaScript integrados, sin frameworks, compilación ni dependencias externas. Los datos de demostración se guardan en el almacenamiento local del navegador y son independientes por origen. No se sincronizan entre dispositivos ni con Supabase.

## Versionado

1. Guarda cada nueva versión con un nombre nuevo, por ejemplo `prototype/versions/Curro_y_Parne_V9_4_4.html`.
2. Nunca edites, renombres ni elimines un histórico. V9.4.3 debe permanecer intacta.
3. Copia exactamente el nuevo histórico a `prototype/current/index.html`.
4. Añade su SHA-256 al manifiesto `prototype/versions/SHA256SUMS`, sin cambiar entradas previas.
5. Actualiza CHANGELOG y la versión indicada aquí; revisa el diff y crea un commit.

V9.4.8 se ha promovido desde `Curro_y_Parne_V9_4_8_Gestion_Oferta_Visible_QA.html` sin modificar sus bytes. Su título es «Curro & Parné · V9.4.8 Gestión de oferta visible QA».

El histórico V9.4.3 procede del archivo entregado `Curro_y_Parne_V9_4_3_Deuda_Operativa_Cerrada_QA.html`, conservado byte a byte. Su título interno todavía dice V9.2 Marketplace QA; se conserva para no alterar el original.

## Backend y seguridad

Supabase será el backend del MVP real. Ya existe un proyecto conectado: **no recrearlo ni ejecutar inicializaciones, migraciones o despliegues como parte de esta organización**. El historial de 17 migraciones del proyecto `crqpjcrpuflufzxiwdfb` y sus tipos se han sincronizado mediante lectura, sin aplicar SQL remoto. Consulta [procedencia, integridad y límites de reproducción](supabase/README.md).

No subir credenciales, contraseñas, tokens, claves `service_role` ni archivos `.env` reales. `.gitignore` es una prevención y no retira secretos del historial. Ante una exposición, detener la publicación y rotar la credencial antes de sanear el historial mediante una actuación expresamente revisada.

La publicación sirve exclusivamente el prototipo actual. Consulta [la guía de Pages](docs/arquitectura/github-pages.md).

## MVP real

La primera base del MVP vive en `app/`: Next.js App Router, React, TypeScript estricto, Tailwind CSS y Supabase Auth SSR. Incluye acceso por correo y contraseña, confirmación, recuperación, onboarding Profesional/Negocio y creación del primer negocio y local mediante las RPC existentes. No incluye todavía el marketplace completo.

Requiere Node.js 22.12 o posterior compatible. Desde `app/`:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

En PowerShell, usa `Copy-Item .env.example .env.local`. Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con la URL y la publishable key del proyecto existente. `APP_ORIGIN` indica el origen de la app para los enlaces de correo. `.env.local` está ignorado por Git.

Abre [la app local](http://localhost:3000). Para validar:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:security
```

Con `npm start` en otra terminal, ejecuta `npm run test:routes`. Los clientes browser/server y el Proxy están separados en `src/lib/supabase/`; las Server Actions y la lógica de dominio viven en `src/features/`. Los tipos se importan de `supabase/database.types.ts`, sin duplicarlos.

Consulta [instalación, arquitectura y Auth](app/README.md) y [QA y límites de validación](app/QA.md). Los documentos legales siguen en borrador, pendientes de revisión. La app SSR necesita un servidor Node para desplegarse; GitHub Pages continúa sirviendo únicamente el prototipo V9.4.8.
