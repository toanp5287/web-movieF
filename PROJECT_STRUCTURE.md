# MovieF – Cấu trúc dự án

Tài liệu tham chiếu nhanh cho codebase MovieF. Cập nhật: 2026-10-15.

## 1. Tổng quan

- **Loại dự án:** frontend HTML/CSS/JavaScript chạy bằng Vite.
- **Backend giả lập/phát triển:** `json-server` đọc dữ liệu từ `data/db.json` tại `http://localhost:3000`.
- **Build/development:** Vite + Tailwind CSS plugin.
- **Upload file khi chạy Vite:** middleware custom trong `vite.config.js`, dùng `multer` để lưu ảnh và video vào `public/`.
- **Ứng dụng:**
  - Khu vực người xem: trang chủ, phim, thể loại, xem phim, yêu thích, hồ sơ, cài đặt, đăng nhập/đăng ký.
  - Khu vực quản trị: dashboard, phim, phim bộ/mùa/tập, thể loại, người dùng, đánh giá, phân quyền và booking.

## 2. Cây thư mục chính

```text
/
├─ index.html                 # Chuyển hướng về /src/pages/home.html
├─ package.json               # Scripts và dependencies
├─ package-lock.json
├─ vite.config.js             # Vite, Tailwind, upload ảnh/video, middleware API
├─ vercel.json                # Rewrite route production
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
├─ src/
│  ├─ main.js                 # Entry chung, hiện import style.css
│  ├─ style.css               # CSS dùng chung
│  ├─ assets/                 # Asset dùng trong source
│  ├─ api.js                  # Wrapper fetch GET/POST/PUT/PATCH/DELETE
│  ├─ utils/storage.js        # Tiện ích localStorage/session storage
│  ├─ pages/                  # HTML các trang phía người xem
│  ├─ admin/                  # HTML các trang quản trị
│  └─ js/
│     ├─ admin/               # JavaScript nghiệp vụ quản trị
│     └─ custumer/            # JavaScript phía người xem (tên thư mục hiện tại)
│        └─ profile/          # Module hồ sơ và các component hồ sơ
├─ .cursor/rules/             # Quy tắc Cursor cho CSS, JS và theme
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

### Quản trị – `src/admin/`

`dashboard.html`, `movies.html`, `addMovie.html`, `editMovie.html`, `genres.html`, `users.html`, `reviews.html`, `authorization.html`, `booking.html`, `phimBo.html`, `sessionMovies.html`, `dashBoard.html`.

> Có cả `dashboard.html` và `dashBoard.html`; cần kiểm tra tên file khi sửa route/import vì hệ thống file production có thể phân biệt hoa thường.

## 4. JavaScript phía người xem

Thư mục: `src/js/custumer/`.

- `auth.js`: đăng nhập/đăng ký và trạng thái xác thực.
- `header.js`: header, menu và trạng thái tài khoản.
- `home.js`: dữ liệu/chức năng trang chủ.
- `movies.js`, `movie-data.js`, `movie-card.js`: danh sách, dữ liệu và render card phim.
- `movie-detail.js`: chi tiết phim.
- `watch.js`, `watch-episode.js`: xem phim/tập.
- `episode-list.js`, `episode-navigation.js`, `series-data.js`: phim bộ, danh sách và chuyển tập.
- `favorite.js`, `history.js`: yêu thích và lịch sử xem.
- `review.js`: đánh giá phim.
- `profile.js`, `profile-service.js`: hồ sơ và service liên quan.
- `profile/`: module hồ sơ tách nhỏ gồm store, service, UI, settings, mock data, icons và các component như `ProfileHeader`, `ProfileStats`, `WatchHistory`, `ReviewList`, `MovieCard`, `PasswordModal`.

## 5. JavaScript quản trị

Thư mục: `src/js/admin/`.

- `dashboard.js`: thống kê/dashboard.
- `movies.js`, `addMovie.js`, `editMovie.js`: CRUD phim.
- `genres.js`: CRUD thể loại.
- `users.js`: quản lý người dùng.
- `authorization.js`: vai trò và quyền.
- `reviews.js` (nếu bổ sung): quản lý đánh giá.
- `phimBo.js`, `createPhimBo.js`: quản lý phim bộ.
- `sessionMovies.js`, `addSession.js`, `updteSession.js`: mùa/tập hoặc session phim.

## 6. Dữ liệu `data/db.json`

Các collection chính:

- `roles`: vai trò và permissions (`admin`, `staff`, `viewer`).
- `users`: tài khoản, hồ sơ, role và trạng thái.
- `season`: mùa/phần phim bộ.
- `episodes`: tập phim.
- `genres`: thể loại.
- `movies`: thông tin phim, poster, video, thể loại và metadata.
- `favorites`: phim yêu thích theo người dùng.
- `histories`: lịch sử xem.
- `reviews`: đánh giá phim.

## 7. API và chạy dự án

### Scripts trong `package.json`

```bash
npm run dev:vite   # Chạy Vite
npm run server      # Chạy json-server ở port 3000
npm run dev         # Chạy đồng thời Vite và json-server
npm run build       # Build production
npm run preview     # Xem bản build
```

### API client

`src/js/api.js` đặt `API_URL = "http://localhost:3000"` và cung cấp:

```js
api.get(endpoint)
api.post(endpoint, data)
api.put(endpoint, data)
api.patch(endpoint, data)
api.delete(endpoint)
```

Ví dụ endpoint json-server: `/movies`, `/users`, `/genres`, `/reviews`.

### Upload file

`vite.config.js` đăng ký middleware:

- `POST /api/upload-image` → lưu vào `public/images/movies/` và trả URL `/images/movies/<filename>`.
- `POST /api/upload-video` → lưu vào `public/videos/` và trả URL `/videos/<filename>`.
- Có thêm xử lý xóa file qua middleware custom trong cùng file.

## 8. Route production trong `vercel.json`

- `/` → `src/pages/home.html`
- `/movies` → `src/pages/movies.html`
- `/movie-detail` → `src/pages/movie-detail.html`
- `/watch` → `src/pages/watch.html`
- `/favorite` → `src/pages/favorite.html`
- `/genres` → `src/pages/genres.html`
- `/profile` → `src/pages/profile.html`
- `/settings` → `src/pages/settings.html`
- `/login` → `src/pages/login.html`
- `/register` → `src/pages/register.html`
- `/admin` → `src/admin/dashboard.html`
- `/admin/movies`, `/admin/genres`, `/admin/users` → các trang quản trị tương ứng.

## 9. Ghi chú khi tiếp tục phát triển

1. Khi sửa giao diện chung, ưu tiên kiểm tra `src/style.css` và `src/main.js`.
2. Khi sửa dữ liệu/API, kiểm tra đồng thời `src/js/api.js`, `data/db.json` và script HTML đang import module.
3. Khi sửa tính năng người xem, tìm code trong `src/js/custumer/`; khi sửa admin, tìm trong `src/js/admin/`.
4. Giữ đường dẫn asset bắt đầu bằng `/images/...` hoặc `/videos/...` khi asset nằm trong `public/`.
5. Một số tên hiện tại có typo/lịch sử (`custumer`, `updteSession.js`, `dashBoard.html`); không đổi tên tùy tiện nếu chưa cập nhật toàn bộ import và route.
