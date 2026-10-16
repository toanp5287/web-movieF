# MovieF – Cấu trúc dự án

Tài liệu tham chiếu cấu trúc và vai trò các phần chính của codebase MovieF. Cập nhật: 2026-10-17.

## 1. Tổng quan

- **Loại dự án:** ứng dụng web frontend đa trang bằng HTML/CSS/JavaScript, chạy với Vite.
- **Backend giả lập/phát triển:** `json-server` đọc `data/db.json` tại `http://localhost:3000`.
- **Build/development:** Vite + plugin Tailwind CSS.
- **Upload file:** middleware custom trong `vite.config.js`, dùng `multer` lưu ảnh vào `public/images/movies/` và video vào `public/videos/`.
- **Email/OTP:** server Node.js riêng trong `server/mailSacThuc.js`, dùng Resend và biến môi trường trong `.env`.
- **Ứng dụng:** khu vực người xem và khu vực quản trị phim, thể loại, người dùng, đánh giá, phim bộ/mùa/tập.

## 2. Cây thư mục chính

```text
/
├─ index.html                 # Chuyển hướng về /src/pages/home.html
├─ package.json               # Scripts và dependencies
├─ package-lock.json
├─ vite.config.js             # Vite, Tailwind, upload ảnh/video, middleware API
├─ vercel.json                # Rewrite route production
├─ README.md                  # Tài liệu dự án
├─ data/
│  └─ db.json                 # Database JSON cho json-server
├─ public/
│  ├─ images/
│  │  ├─ actors/              # Ảnh diễn viên/nhân vật
│  │  ├─ avatar/              # Avatar người dùng
│  │  ├─ backgrounds/         # Ảnh nền/banner
│  │  ├─ logo/                # Logo
│  │  └─ movies/              # Poster phim, ảnh upload
│  ├─ videos/                 # Video phim/trailer, video upload
│  ├─ icons.svg
│  └─ favicon.svg
├─ server/
│  └─ mailSacThuc.js          # HTTP server OTP/xác thực email qua Resend
├─ src/
│  ├─ main.js                 # Entry chung, import style.css
│  ├─ style.css               # CSS dùng chung
│  ├─ assets/                 # Asset tĩnh dùng trong source
│  ├─ js/api.js               # Wrapper fetch GET/POST/PUT/PATCH/DELETE
│  ├─ utils/                  # Auth guard, khôi phục phiên, logout, storage
│  ├─ pages/                  # HTML các trang phía người xem
│  ├─ admin/                  # HTML các trang quản trị
│  └─ js/
│     ├─ admin/               # JavaScript nghiệp vụ quản trị
│     └─ custumer/            # JavaScript phía người xem (tên thư mục hiện tại)
│        └─ profile/          # Module hồ sơ và các component hồ sơ
└─ *.ps1                      # Script hỗ trợ sửa/đổ context dự án
```

## 3. Các trang HTML

### Người xem – `src/pages/`

| File | Chức năng |
|---|---|
| `home.html` | Trang chủ |
| `movies.html` | Danh sách/tìm kiếm phim |
| `movie-detail.html` | Chi tiết phim |
| `watch.html` | Trình xem phim |
| `favorite.html` | Danh sách yêu thích |
| `genres.html` | Danh sách thể loại |
| `top-movies.html` | Phim nổi bật/xếp hạng |
| `profile.html` | Hồ sơ người dùng |
| `settings.html` | Cài đặt tài khoản |
| `membership.html` | Thành viên/gói dịch vụ |
| `login.html` | Đăng nhập |
| `register.html` | Đăng ký |
| `datLaiMatKhau.htm` | Đặt lại mật khẩu |
| `xacThucMaEmail.html` | Xác thực mã email/OTP |

### Quản trị – `src/admin/`

`dashboard.html`, `movies.html`, `addMovie.html`, `editMovie.html`, `genres.html`, `users.html`, `reviews.html`, `authorization.html`, `booking.html`, `phimBo.html`, `sessionMovies.html`, `trash.html`.

`trash.html` phục vụ quản lý dữ liệu/phim đã xóa. Tên file và thư mục có typo lịch sử (`custumer`, `updteSession.js`); cần giữ nguyên khi chưa cập nhật toàn bộ import.

## 4. JavaScript phía người xem

Thư mục: `src/js/custumer/`.

- `auth.js`: đăng nhập/đăng ký và trạng thái xác thực.
- `header.js`: header, menu và trạng thái tài khoản.
- `home.js`, `movies.js`, `movie-data.js`, `movie-card.js`: dữ liệu, danh sách và render card phim.
- `movie-detail.js`: chi tiết phim.
- `watch.js`, `watch-episode.js`: xem phim/tập.
- `episode-list.js`, `episode-navigation.js`, `series-data.js`: phim bộ, danh sách và chuyển tập.
- `favorite.js`, `history.js`: yêu thích và lịch sử xem.
- `review.js`: đánh giá phim.
- `profile.js`, `profile-service.js`: hồ sơ và service liên quan.
- `resetPassword.js`: luồng đặt lại mật khẩu.
- `profile/`: module hồ sơ gồm `app`, `store`, `service`, `ui`, `settings`, `mock-data`, `icons`, `utils` và các component `ProfileHeader`, `ProfileStats`, `WatchHistory`, `ContinueWatching`, `FavoriteMovies`, `ReviewList`, `MovieCard`, `PasswordModal`, `EditProfileModal`, `Header`, `Footer`.

## 5. JavaScript quản trị

Thư mục: `src/js/admin/`.

- `dashboard.js`: thống kê/dashboard.
- `movies.js`, `addMovie.js`, `editMovie.js`: CRUD phim.
- `genres.js`: CRUD thể loại.
- `users.js`: quản lý người dùng.
- `authorization.js`: vai trò và quyền.
- `phimBo.js`, `createPhimBo.js`: quản lý phim bộ.
- `sessionMovies.js`, `addSession.js`, `updteSession.js`: mùa/tập hoặc session phim.
- `trash.js`: quản lý dữ liệu đã xóa.

## 6. Tiện ích dùng chung

- `src/js/api.js`: client gọi JSON Server tại `http://localhost:3000`, cung cấp `get`, `post`, `put`, `patch`, `delete`.
- `src/utils/storage.js`: thao tác localStorage/sessionStorage.
- `src/utils/auth-init.js`, `auth-restore.js`, `auth-guard.js`, `auth-logout.js`: khởi tạo, khôi phục, bảo vệ và đăng xuất phiên xác thực.
- `src/utils/remember-me.js`: hỗ trợ ghi nhớ đăng nhập.
- `src/style.css`: CSS giao diện dùng chung.

## 7. Dữ liệu `data/db.json`

Các collection chính gồm `roles`, `users`, `season`, `episodes`, `genres`, `movies`, `favorites`, `histories` và `reviews`. Đây là nguồn dữ liệu cho JSON Server và các màn hình người xem/quản trị.

## 8. API upload và OTP

`vite.config.js` đăng ký middleware:

- `POST /api/upload-image` → lưu vào `public/images/movies/`, trả URL `/images/movies/<filename>`.
- `POST /api/upload-video` → lưu vào `public/videos/`, trả URL `/videos/<filename>`.
- Có xử lý xóa file qua middleware custom trong cùng file.

`server/mailSacThuc.js` chạy cổng OTP mặc định `3001`, kiểm tra email qua JSON Server, tạo mã có thời hạn, giới hạn số lần thử/gửi lại và gửi email bằng Resend.

## 9. Scripts chạy dự án

```bash
npm run dev:vite   # Chạy Vite
npm run server      # Chạy json-server ở port 3000
npm run dev         # Chạy đồng thời Vite và json-server
npm run build       # Build production
npm run preview     # Xem bản build
npm run mail        # Chạy server OTP/email
```

## 10. Route production trong `vercel.json`

Các route chính gồm `/`, `/movies`, `/movie-detail`, `/watch`, `/favorite`, `/genres`, `/profile`, `/settings`, `/login`, `/register` và `/admin`. Các route được rewrite tới HTML tương ứng trong `src/pages/` hoặc `src/admin/`.

## 11. Ghi chú phát triển

1. Khi sửa giao diện chung, kiểm tra `src/style.css` và `src/main.js`.
2. Khi sửa dữ liệu/API, kiểm tra `src/js/api.js`, `data/db.json` và script HTML đang import module.
3. Khi sửa tính năng người xem, tìm code trong `src/js/custumer/`; khi sửa admin, tìm trong `src/js/admin/`.
4. Giữ đường dẫn asset bắt đầu bằng `/images/...` hoặc `/videos/...` khi asset nằm trong `public/`.
5. Không đổi tùy tiện các tên lịch sử như `custumer`, `updteSession.js`, `datLaiMatKhau.htm` nếu chưa cập nhật toàn bộ import và route.
