# Prototipo estático y GitHub Pages

El workflow `.github/workflows/pages.yml` publica únicamente `prototype/current/index.html` en esa misma ruta dentro del sitio. El artefacto no incluye documentos, históricos ni archivos del backend. La raíz del sitio ofrece un enlace al prototipo.

## Activación

1. Revisa e integra la rama `chore/repository-structure` en `main` cuando proceda.
2. En GitHub, Settings → Pages → Build and deployment, elige **GitHub Actions**.
3. Ejecuta el workflow **Deploy prototype to GitHub Pages** desde `main`, o envía un cambio en el prototipo/workflow a `main`.
4. Comprueba el despliegue y visita `https://bansaqui.github.io/Curro-Parn-/prototype/current/index.html`.

No cambies la visibilidad del repositorio ni publiques archivos adicionales para activar Pages. El workflow requiere permisos `pages: write` e `id-token: write` para desplegar mediante el entorno `github-pages`.

Documentación oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Comprobaciones

Comprueba que current y el histórico seleccionado son idénticos; revisa credenciales antes de publicar. Sirve el repositorio con `python -m http.server 8000 --bind 127.0.0.1` y abre la ruta completa. Comprueba las vistas de negocio y profesional y la persistencia local.

Los datos de `localStorage` no se transfieren desde Netlify ni entre `file://`, localhost y Pages. El título interno del HTML original indica V9.2 aunque el archivo suministrado corresponde a V9.4.3; no se modifica el histórico para corregirlo.
