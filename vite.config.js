import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import multer from "multer";
import fs from "fs";

// ========================================
// THƯ MỤC LƯU FILE
// ========================================

const imageDir = resolve("public/images/movies");
const videoDir = resolve("public/videos");

fs.mkdirSync(imageDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

console.log("📁 IMAGE DIR:", imageDir);
console.log("📁 VIDEO DIR:", videoDir);

// ========================================
// UPLOAD ẢNH
// ========================================

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageDir);
  },

  filename: (req, file, cb) => {
    const ext = file.originalname.includes(".")
      ? file.originalname.substring(file.originalname.lastIndexOf("."))
      : "";

    const name = Date.now() + "-" + Math.random().toString(36).substring(2, 8);

    cb(null, name + ext.toLowerCase());
  },
});

const uploadImage = multer({
  storage: imageStorage,
});

// ========================================
// UPLOAD VIDEO
// ========================================

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoDir);
  },

  filename: (req, file, cb) => {
    const ext = file.originalname.includes(".")
      ? file.originalname.substring(file.originalname.lastIndexOf("."))
      : "";

    const name = Date.now() + "-" + Math.random().toString(36).substring(2, 8);

    cb(null, name + ext.toLowerCase());
  },
});

const uploadVideo = multer({
  storage: videoStorage,
});

// ========================================
// VITE CONFIG
// ========================================

export default defineConfig({
  plugins: [
    tailwindcss(),

    // ========================================
    // PLUGIN MOVIEF
    // ========================================

    {
      name: "movief-plugin",

      configureServer(server) {
        // ========================================
        // API UPLOAD + DELETE FILE
        // ========================================

        server.middlewares.use((req, res, next) => {
          const url = req.url ? req.url.split("?")[0] : "";

          // ======================================
          // UPLOAD ẢNH
          // POST /api/upload-image
          // ======================================

          if (url === "/api/upload-image" && req.method === "POST") {
            console.log("📸 NHẬN REQUEST UPLOAD ẢNH");

            uploadImage.single("file")(req, res, (error) => {
              if (error) {
                console.error("❌ LỖI UPLOAD ẢNH:", error);

                res.statusCode = 500;

                res.setHeader("Content-Type", "application/json");

                res.end(
                  JSON.stringify({
                    success: false,
                    message: error.message,
                  }),
                );

                return;
              }

              console.log("📦 FILE ẢNH:", req.file);

              if (!req.file) {
                res.statusCode = 400;

                res.setHeader("Content-Type", "application/json");

                res.end(
                  JSON.stringify({
                    success: false,
                    message: "Không có file ảnh",
                  }),
                );

                return;
              }

              res.statusCode = 200;

              res.setHeader("Content-Type", "application/json");

              res.end(
                JSON.stringify({
                  success: true,

                  url: `/images/movies/${req.file.filename}`,
                }),
              );
            });

            return;
          }

          // ======================================
          // UPLOAD VIDEO
          // POST /api/upload-video
          // ======================================

          if (url === "/api/upload-video" && req.method === "POST") {
            console.log("🎬 NHẬN REQUEST UPLOAD VIDEO");

            uploadVideo.single("file")(req, res, (error) => {
              if (error) {
                console.error("❌ LỖI UPLOAD VIDEO:", error);

                res.statusCode = 500;

                res.setHeader("Content-Type", "application/json");

                res.end(
                  JSON.stringify({
                    success: false,
                    message: error.message,
                  }),
                );

                return;
              }

              console.log("📦 FILE VIDEO:", req.file);

              if (!req.file) {
                res.statusCode = 400;

                res.setHeader("Content-Type", "application/json");

                res.end(
                  JSON.stringify({
                    success: false,
                    message: "Không có file video",
                  }),
                );

                return;
              }

              res.statusCode = 200;

              res.setHeader("Content-Type", "application/json");

              res.end(
                JSON.stringify({
                  success: true,

                  url: `/videos/${req.file.filename}`,
                }),
              );
            });

            return;
          }

          // ======================================
          // XÓA FILE CŨ
          // POST /api/delete-file
          // ======================================

          if (url === "/api/delete-file" && req.method === "POST") {
            console.log("🗑️ NHẬN REQUEST XÓA FILE");

            let body = "";

            req.on("data", (chunk) => {
              body += chunk;
            });

            req.on("end", () => {
              try {
                const { filePath } = JSON.parse(body);

                // Không có file
                if (!filePath) {
                  res.statusCode = 400;

                  res.setHeader("Content-Type", "application/json");

                  res.end(
                    JSON.stringify({
                      success: false,
                      message: "Không có đường dẫn file",
                    }),
                  );

                  return;
                }

                // ==================================
                // KHÔNG XÓA LINK ONLINE
                // ==================================

                if (
                  filePath.startsWith("http://") ||
                  filePath.startsWith("https://")
                ) {
                  res.statusCode = 200;

                  res.setHeader("Content-Type", "application/json");

                  res.end(
                    JSON.stringify({
                      success: true,
                      message: "File online, không cần xóa",
                    }),
                  );

                  return;
                }

                // ==================================
                // CHUYỂN URL → PATH
                // ==================================

                const cleanPath = filePath
                  .replace(/^\/+/, "")
                  .replace(/^(\.\.\/)+/, "");

                const publicDir = resolve("public");

                const fileFullPath = resolve(publicDir, cleanPath);

                // ==================================
                // BẢO VỆ THƯ MỤC PUBLIC
                // ==================================

                if (!fileFullPath.startsWith(publicDir)) {
                  res.statusCode = 403;

                  res.setHeader("Content-Type", "application/json");

                  res.end(
                    JSON.stringify({
                      success: false,
                      message: "Đường dẫn file không hợp lệ",
                    }),
                  );

                  return;
                }

                // ==================================
                // XÓA FILE
                // ==================================

                if (fs.existsSync(fileFullPath)) {
                  fs.unlinkSync(fileFullPath);

                  console.log("🗑️ ĐÃ XÓA FILE:", fileFullPath);
                } else {
                  console.log("⚠️ FILE KHÔNG TỒN TẠI:", fileFullPath);
                }

                // ==================================
                // RESPONSE
                // ==================================

                res.statusCode = 200;

                res.setHeader("Content-Type", "application/json");

                res.end(
                  JSON.stringify({
                    success: true,
                  }),
                );
              } catch (error) {
                console.error("❌ LỖI XÓA FILE:", error);

                res.statusCode = 500;

                res.setHeader("Content-Type", "application/json");

                res.end(
                  JSON.stringify({
                    success: false,
                    message: error.message,
                  }),
                );
              }
            });

            return;
          }

          // ======================================
          // KHÔNG PHẢI API CỦA MOVIEF
          // ======================================

          next();
        });

        // ========================================
        // ROUTE MOVIEF
        // ========================================

        server.middlewares.use((req, res, next) => {
          const rawUrl = req.url ? req.url.split("?")[0] : "/";

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

            "/admin/editMovie": "/src/admin/editMovie.html",

            "/admin/addMovie": "/src/admin/addMovie.html",
            "/admin/users": "/src/admin/users.html",
            "/admin/genres": "/src/admin/genres.html",
            "/admin/dashBoard": "/src/admin/dashBoard.html",
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

  // ========================================
  // SERVER
  // ========================================

  server: {
    // Không theo dõi thư mục dữ liệu của json-server.
    // Nếu không ignore, mỗi lần POST/PUT/PATCH ghi vào data/db.json
    // sẽ làm Vite gửi HMR "full-reload" => trình duyệt location.reload()
    // => chết trước khi chạy tới window.location.replace("/admin")
    // trong addMovie.js và editMovie.js.
    watch: {
      ignored: [
        "**/data/**",
        "**/db.json",
        "**/public/images/movies/**",
        "**/public/videos/**",
      ],
    },
  },

  // ========================================
  // BUILD
  // ========================================

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

        editMovie: resolve(import.meta.dirname, "src/admin/editMovie.html"),

        addMovie: resolve(import.meta.dirname, "src/admin/addMovie.html"),
      },

      output: {
        entryFileNames: "assets/[name]-[hash].js",

        chunkFileNames: "assets/[name]-[hash].js",

        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
