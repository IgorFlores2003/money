import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Em desenvolvimento, /api roda dentro do próprio Vite (mesmo código da Vercel). */
function api(): Plugin {
  return {
    name: "meudimdim-api",
    configureServer(server) {
      Object.assign(process.env, loadEnv("development", process.cwd(), ""));
      server.middlewares.use("/api", async (req, res) => {
        const { nodeHandler } = await server.ssrLoadModule("/api/_lib/http.ts");
        const path = new URL(req.url || "/", "http://local").pathname.replace(/^\//, "");
        await nodeHandler(req, res, path);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), api()],
  resolve: { dedupe: ["react", "react-dom"] },
});
