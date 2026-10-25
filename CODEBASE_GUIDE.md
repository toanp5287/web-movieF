# MovieF — Codebase Guide cho lần làm việc sau

Tài liệu tra cứu nhanh source hiện tại. Cập nhật: 2026-10-26.

> Dùng để tìm khu vực có khả năng liên quan trước khi sửa. Khi làm task cụ thể,
> vẫn phải kiểm tra file và call site liên quan; không dựa vào tài liệu này thay
> cho việc xác minh code hiện tại.

## 1. Stack và cách chạy

- Frontend nhiều trang: HTML + CSS + JavaScript ES modules.
- Build/dev: Vite 8, Tailwind CSS 4 qua `@tailwindcss/vite`.
- JSON Server: `data/db.json`, cổng `3000`.
- `npm run dev`: chạy đồng thời Vite và JSON Server.
- `npm run build`, `npm run preview`: build và xem production.
- Server phụ: `npm run mail` (OTP), `npm run payment` (VNPay), `npm run tele` (Telegram).
- Entry chung `src/main.js` chỉ import `src/style.css`; từng trang HTML tự nạp module cần dùng.

## 2. Cây source

```text
/
├─ index.html
├─ package.json
├─ vite.config.js
├─ vercel.json
├─ data/db.json
├─ public/                    # ảnh, video, icon, favicon
├─ server/
│  ├─ mailSacThuc.js          # OTP/xác thực email
│  ├─ paymentServer.js        # API thanh toán VNPay
│  ├─ paymentService.js       # tạo đơn, ký/xác minh kết quả VNPay
│  └─ telegram.js             # liên kết/đăng nhập qua Telegram
└─ src/
   ├─ main.js                 # CSS entry
   ├─ style.css               # theme/token Tailwind + style chung
   ├─ pages/                  # HTML phía người xem
   ├─ admin/                  # HTML quản trị
   ├─ js/api.js               # client JSON Server
   ├─ js/admin/                # module nghiệp vụ admin
   ├─ js/custumer/             # module phía người xem (tên thư mục hiện hữu)
   │  └─ profile/              # app/service/store/components hồ sơ
   └─ utils/                   # auth, session và phân quyền
```

## 3. Trang và module entry

### Người xem — `src/pages/`

| Trang | Module/điểm vào chính |
|---|---|
| `home.html` | `custumer/home.js`, `auth.js`, `header.js`, `search-suggest.js` |
| `movies.html` | `auth.js`, `header.js`, `movies.js`, `search-suggest.js` |
| `movie-detail.html` | `movie-detail.js` (inline import), `auth.js`, `header.js`, `favorite.js`, `search-suggest.js` |
| `watch.html` | `auth.js`, `header.js`, `history.js`, `watch.js`, `search-suggest.js` |
| `top-movies.html` | `top-movies.js`, `auth.js`, `header.js`, `search-suggest.js` |
| `favorite.html` | `header.js`, `search-suggest.js` |
| `genres.html` | tìm kiếm/gợi ý trong trang + `search-suggest.js` |
| `profile.html` | `custumer/profile/app.js` |
| `settings.html` | `custumer/profile/settings.js` |
| `login.html`, `register.html` | `auth.js` |
| `membership.html` | `membership.js`, `auth.js`, `header.js`, `search-suggest.js` |
| `datLaiMatKhau.htm` | trang đặt lại mật khẩu; kiểm tra HTML import khi sửa |
| `xacThucMaEmail.html` | giao diện xác thực OTP/email |

### Quản trị — `src/admin/`

| Trang | Module chính |
|---|---|
| `dashboard.html` | `dashboard.js`, `sidebar.js` |
| `movies.html` | `movies.js`, `sidebar.js` |
| `addMovie.html` | `addMovie.js`, `sidebar.js` |
| `editMovie.html` | `editMovie.js`, `sidebar.js` |
| `genres.html` | `genres.js`, `sidebar.js` |
| `users.html` | `users.js`, `sidebar.js` |
| `authorization.html` | `authorization.js`, `sidebar.js` |
| `reviews.html` | logic quản lý review được viết inline trong HTML; nạp `storage.js` để kiểm tra quyền |
| `phimBo.html` | `phimBo.js`, `createPhimBo.js`, `updateEnpoin.js`, `sidebar.js` |
| `sessionMovies.html` | `sessionMovies.js`, `addSession.js`, `sidebar.js` |
| `booking.html` | hiện đang nạp `movies.js`; cần xác minh nếu sửa booking |
| `trash.html` | `trash.js`, `sidebar.js` |

Các module admin hiện có: `addMovie.js`, `addSession.js`, `authorization.js`, `createPhimBo.js`, `dashboard.js`, `editMovie.js`, `genres.js`, `movies.js`, `phimBo.js`, `sessionMovies.js`, `sidebar.js`, `trash.js`, `updateEnpoin.js`, `updteSession.js`, `users.js`.

## 4. Phân vùng JavaScript phía người xem

Thư mục chính: `src/js/custumer/`.

- `auth.js`: đăng nhập, đăng ký, hash mật khẩu phía client và luồng xác thực tài khoản.
- `header.js`: trạng thái header/menu/tài khoản.
- `home.js`: trang chủ; rail tiếp tục xem lấy từ `histories`.
- `movie-data.js`: tải/chuẩn hóa catalog; fallback `/data/db.json`; URL ảnh, lọc phim đang xuất bản, rating helpers và tiện ích dùng chung.
- `movies.js`, `movie-card.js`, `top-movies.js`: danh sách, card, xếp hạng phim.
- `movie-detail.js`: nội dung chi tiết, đánh giá/bình luận, gửi/sửa/xóa/report, phân tập liên quan.
- `favorite.js`: danh sách/thao tác phim yêu thích.
- `history.js`: lưu tiến độ xem; tài khoản ghi `histories`, khách có lưu trữ cục bộ theo module.
- `watch.js`, `watch-episode.js`: player, UI điều khiển, tải video/phim hoặc tập.
- `series-data.js`, `episode-list.js`, `episode-navigation.js`: dữ liệu mùa/tập và điều hướng tập tiếp theo/resume.
- `search-history.js`, `search-suggest.js`: lưu từ khóa và gợi ý tìm kiếm.
- `profile.js`, `profile-service.js`: module hồ sơ cũ/độc lập, không nhầm với module mới trong `profile/`.
- `profile/`: app hồ sơ, `service.js` tải/chuẩn hóa data, `store.js` state, `settings.js`, `mock-data.js`, `utils.js`, `ui.js`, `icons.js`.
- `review.js`: hiện file rỗng; luồng review thực tế trên trang chi tiết nằm trong `movie-detail.js`.
- `membership.js`: giao diện/luồng gói thành viên; thanh toán backend ở `server/`.
- `resetPassword.js`: logic đặt lại mật khẩu.

### Components hồ sơ — `src/js/custumer/profile/components/`

`Header.js`, `Footer.js`, `ProfileHeader.js`, `ProfileStats.js`, `ProfileNavigation.js`, `ProfileSidebar.js`, `WatchHistory.js`, `ContinueWatching.js`, `FavoriteMovies.js`, `MovieCard.js`, `ReviewList.js`, `Settings.js`, `PasswordModal.js`, `EditProfileModal.js`.

Khi sửa dữ liệu hồ sơ: tìm nơi chuẩn hóa trước trong `profile/service.js`, sau đó UI tương ứng trong `components/` và cách mount/render trong `profile/app.js`.

## 5. Phân vùng admin

- `dashboard.js`: tổng quan KPI, trạng thái phim, thể loại, top phim, review gần đây.
- `movies.js`: danh sách/lọc/quản lý phim.
- `addMovie.js`, `editMovie.js`: form CRUD phim, validate, upload media.
- `genres.js`: CRUD/lọc thể loại.
- `users.js`: tài khoản, vai trò, trạng thái, modal sửa.
- `authorization.js`: role/permissions.
- `phimBo.js`, `createPhimBo.js`: phim bộ và tạo tập.
- `sessionMovies.js`, `addSession.js`, `updteSession.js`, `updateEnpoin.js`: mùa/tập; xem script tag trong trang trước khi sửa vì tên module có typo/lịch sử.
- `trash.js`: xem, lọc, khôi phục dữ liệu đã xóa.
- `sidebar.js`: active menu và ẩn một số mục theo vai trò.
- `reviews.html`: quản lý review đang dùng script inline; chưa có `src/js/admin/reviews.js`.

## 6. API, dữ liệu và server

### API client

`src/js/api.js` dùng `http://localhost:3000` và expose `get`, `post`, `put`, `patch`, `delete`. Client hiện parse JSON trực tiếp; khi điều tra lỗi HTTP, kiểm tra `response.ok` tại call site/API helper.

### Collections `data/db.json`

`roles`, `users`, `payments`, `season`, `episodes`, `genres`, `movies`, `favorites`, `histories`, `reviews`, `reviewReports`, `searchHistories`.

### Vite middleware — `vite.config.js`

- `POST /api/upload-image` → `public/images/movies/`
- `POST /api/upload-video` → `public/videos/`
- `POST /api/delete-file` → xóa file public theo middleware
- Vite config cũng đăng ký Tailwind plugin và multi-page build/input.

### Server phụ

- `server/mailSacThuc.js`: server OTP email, dùng Resend; config môi trường qua `.env`; mặc định cổng 3001.
- `server/paymentServer.js` + `paymentService.js`: API membership/VNPay, mặc định cổng 3002; JSON Server lưu orders/payments và VNPay ký/xác minh callback.
- `server/telegram.js`: HTTP endpoints và Telegram webhook/link flow; mặc định `TELEGRAM_PORT=3002` (trùng default payment server, cần đổi cổng nếu chạy đồng thời).

## 7. Trạng thái review/comment hiện tại

- Gửi comment trên trang chi tiết: `src/js/custumer/movie-detail.js`, tạo review `status: "pending"`.
- Trang phim: chỉ người sở hữu thấy review pending cùng nhãn “Đang chờ duyệt”; public review và summary điểm chỉ tính `visible`.
- Trang admin: `src/admin/reviews.html` có filter trạng thái và thao tác duyệt/ẩn; thao tác đưa review sang visible kiểm tra role Admin.
- Hồ sơ: `profile/service.js` giữ status; `components/ReviewList.js` hiển thị pending/hidden.
- Lưu ý: tiện ích điểm rating chung trong `movie-data.js` nhận list reviews; khi sửa nơi khác dùng rating, xác minh rằng review pending không bị tính/hiện nhầm.

## 8. Xác thực và quyền

- `src/utils/storage.js`: kiểm tra phiên admin và quyền role (`admin`, `staff`); các module admin gọi hàm trước khi khởi tạo.
- `auth-init.js`, `auth-restore.js`, `auth-logout.js`, `auth-guard.js`, `remember-me.js`: khởi tạo/khôi phục/đăng xuất/bảo vệ route/ghi nhớ đăng nhập.
- Nhiều module người dùng đọc `localStorage.currentUser`; JSON Server vẫn là nguồn dữ liệu chính cho người dùng đã đăng nhập.
- Chú ý một số helper auth có đường dẫn import cũ hoặc có thể không được nạp trực tiếp; kiểm tra import trước khi sửa.

## 9. Quy tắc làm việc theo yêu cầu của người dùng

1. Trước khi sửa, xác định và báo đúng danh sách file; chờ người dùng đồng ý khi yêu cầu của họ đòi hỏi duyệt file.
2. Ưu tiên sửa ít file nhất và không đụng file không liên quan.
3. Viết JavaScript thuần, cơ bản, dễ đọc; tránh kiến trúc/kỹ thuật phức tạp không cần thiết.
4. Giữ nguyên tên hiện hữu như `custumer`, `updteSession.js`, `updateEnpoin.js`, `datLaiMatKhau.htm` nếu chưa có yêu cầu đổi.
5. Không ghi đè thay đổi dữ liệu làm việc của người dùng; kiểm tra `git status` trước/sau.
6. Sau sửa, kiểm tra `git diff --check`; chạy build hoặc kiểm tra phù hợp với phạm vi thay đổi.

## 10. Bắt đầu xử lý task mới

1. Xác định trang/feature và đọc HTML entry để biết module thực sự được nạp.
2. Dùng tìm kiếm theo selector, endpoint, field dữ liệu hoặc handler để lần từ UI tới logic/API.
3. Với lỗi không rõ, đọc console/network symptom hoặc hỏi thông tin lỗi; không sửa dựa trên phỏng đoán.
4. Nêu nguyên nhân, file dự kiến thay đổi và chờ xác nhận nếu cần duyệt trước.
5. Chỉ đọc sâu các call site có liên quan thay vì quét lại toàn bộ source.
