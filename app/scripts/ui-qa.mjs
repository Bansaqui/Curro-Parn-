// Local component QA only. Never imported by Next.js or deployed as an app route.
import { createServer } from "vite";
import path from "node:path";
const root = process.cwd();
const mock = path.join(root, "tests/manual/actions.ts");
const server = await createServer({
  configFile: false,
  root: path.join(root, "tests/manual"),
  envDir: false,
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "next/link": path.join(root, "tests/manual/link.tsx"),
    },
  },
  plugins: [
    {
      name: "isolated-actions",
      enforce: "pre",
      resolveId(source, importer) {
        if (
          source === "./actions" &&
          importer?.replaceAll("\\", "/").includes("/src/features/")
        )
          return mock;
        if (source.includes("supabase"))
          throw new Error("Supabase is forbidden in the isolated UI fixture");
      },
    },
  ],
  esbuild: { jsx: "automatic" },
  server: {
    host: "127.0.0.1",
    port: 3001,
    strictPort: true,
    fs: { allow: [root] },
  },
});
await server.listen();
console.log(
  "Isolated UI QA: http://127.0.0.1:3001 (mock actions; no Supabase)",
);
