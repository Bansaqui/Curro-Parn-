# Curro & Parné

Prototipo de una plataforma que conecta negocios y profesionales para cubrir servicios y gestionar su actividad. Mercado inicial: **Málaga**.

**Estado: prototipo / pre-MVP. Versión funcional actual: V9.4.3.**

## Estructura

- `prototype/current/index.html`: versión funcional en pruebas.
- `prototype/versions/`: originales históricos inmutables y sus huellas SHA-256.
- `docs/producto/`: alcance y decisiones de producto.
- `docs/arquitectura/`: funcionamiento técnico y publicación.
- `docs/legal/`: espacio reservado para documentación legal revisada.
- `supabase/migrations/` y `supabase/functions/`: espacio para el backend existente cuando sus archivos se incorporen de forma revisada.
- `app/`: reservado para el futuro MVP; no contiene una aplicación ni dependencias.

## Abrir el prototipo

Abre `prototype/current/index.html` directamente en un navegador. Para probar con HTTP desde la raíz del repositorio:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Visita `http://127.0.0.1:8000/prototype/current/index.html`.

URL prevista de GitHub Pages, disponible después de activar Pages y completar el despliegue:
https://bansaqui.github.io/Curro-Parn-/prototype/current/index.html

El HTML contiene CSS y JavaScript integrados, sin frameworks, compilación ni dependencias externas. Los datos de demostración se guardan en el almacenamiento local del navegador y son independientes por origen. No se sincronizan entre dispositivos ni con Supabase.

## Versionado

1. Guarda cada nueva versión con un nombre nuevo, por ejemplo `prototype/versions/Curro_y_Parne_V9_4_4.html`.
2. Nunca edites, renombres ni elimines un histórico. V9.4.3 debe permanecer intacta.
3. Copia exactamente el nuevo histórico a `prototype/current/index.html`.
4. Añade su SHA-256 al manifiesto `prototype/versions/SHA256SUMS`, sin cambiar entradas previas.
5. Actualiza CHANGELOG y la versión indicada aquí; revisa el diff y crea un commit.

V9.4.3 procede del archivo entregado `Curro_y_Parne_V9_4_3_Deuda_Operativa_Cerrada_QA.html`, conservado byte a byte. Su título interno todavía dice V9.2 Marketplace QA; se conserva para no alterar el original.

## Backend y seguridad

Supabase será el backend del MVP real. Ya existe un proyecto conectado: **no recrearlo ni ejecutar inicializaciones, migraciones o despliegues como parte de esta organización**. El repositorio original solo contenía README; no se han encontrado archivos de configuración de Supabase que importar o reorganizar.

No subir credenciales, contraseñas, tokens, claves `service_role` ni archivos `.env` reales. `.gitignore` es una prevención y no retira secretos del historial. Ante una exposición, detener la publicación y rotar la credencial antes de sanear el historial mediante una actuación expresamente revisada.

La publicación sirve exclusivamente el prototipo actual. Consulta [la guía de Pages](docs/arquitectura/github-pages.md).
