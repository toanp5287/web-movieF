import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    tailwindcss(),

    // Chỉ dùng khi chạy npm run dev
    {
      name: "rewrite-routes",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url ? req.url.split("?")[0] : "";
          const path = rawUrl.replace(/\/$/, "") || "/";

          const routes = {
            "/": "/src/pages/home.html",
            "/admin": "/src/admin/movies.html",
            "/movies": "/src/pages/movies.html",
            "/movie-detail": "/src/pages/movie-detail.html",
            "/watch": "/src/pages/watch.html",
            "/favorite": "/src/pages/favorite.html",
            "/genres": "/src/pages/genres.html",
            "/profile": "/src/pages/profile.html",
            "/login": "/src/pages/login.html",
            "/register": "/src/pages/register.html",
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
        index: resolve(import.meta.dirname, "src/pages/home.html"),
        admin: resolve(import.meta.dirname, "src/admin/movies.html"),
        movies: resolve(import.meta.dirname, "src/pages/movies.html"),
        "movie-detail": resolve(
          import.meta.dirname,
          "src/pages/movie-detail.html",
        ),
        watch: resolve(import.meta.dirname, "src/pages/watch.html"),
        favorite: resolve(import.meta.dirname, "src/pages/favorite.html"),
        genres: resolve(import.meta.dirname, "src/pages/genres.html"),
        profile: resolve(import.meta.dirname, "src/pages/profile.html"),
        login: resolve(import.meta.dirname, "src/pages/login.html"),
        register: resolve(import.meta.dirname, "src/pages/register.html"),
      },

      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
