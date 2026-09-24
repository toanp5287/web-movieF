import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "rewrite-routes",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url ? req.url.split("?")[0] : "";
          const path = rawUrl.replace(/\/$/, "") || "/";

          const routes = {
            "/admin": "/src/admin/index.html",
            "/movies": "/src/pages/movies.html",
            "/movie-detail": "/src/pages/movie-detail.html",
          };

          if (routes[path]) {
            const query = req.url.includes("?")
              ? req.url.slice(req.url.indexOf("?"))
              : "";
            req.url = routes[path] + query;
          }

          next();
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "src/admin/index.html"),
        movies: resolve(__dirname, "src/pages/movies.html"),
        movieDetail: resolve(__dirname, "src/pages/movie-detail.html"),
      },
    },
  },
});
