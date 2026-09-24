import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "rewrite-routes",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url ? req.url.split("?")[0] : "";
          const path = rawUrl.replace(/\/$/, "") || "/";

          // Ánh xạ URL sang các file thực tế trong thư mục src/
          const routes = {
            "/admin": "/src/admin/index.html",
            "/movies": "/src/pages/movies.html",
            "/movie-detail": "/src/pages/movie-detail.html",
            // Nếu bạn có trang xem phim riêng thì thêm dòng dưới:
            // "/watch": "/src/pages/watch.html",
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
});
