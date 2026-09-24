import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "rewrite-routes",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Lấy pathname bỏ query string (?id=123...) và bỏ dấu '/' ở cuối
          const rawUrl = req.url ? req.url.split("?")[0] : "";
          const path = rawUrl.replace(/\/$/, "") || "/";

          // Bảng ánh xạ URL đẹp -> File vật lý trong project
          const routes = {
            "/": "/src/pages/home.html",
            "/admin": "/src/admin/movies.html",
            "/movies": "/src/pages/movies.html",
            "/movie-detail": "/src/pages/movie-detail.html", // Đổi nếu file của bạn đặt ở thư mục khác
            "/watch": "/src/pages/watch.html",
            "/favorite": "/src/pages/favorite.html",
            "/genres": "/src/pages/genres.html",
            "/profile": "/src/pages/profile.html",
            "/login": "/src/pages/login.html",
            "/register": "/src/pages/register.html",
          };

          if (routes[path]) {
            // Giữ lại phần query string (nếu có) khi rewrite
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
