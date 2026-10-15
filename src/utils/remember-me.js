// ============================================================================
// remember-me.js
// Chức năng: "Ghi nhớ đăng nhập" (Remember me).
//
// Mục đích:
//   - Đọc trạng thái của checkbox "Ghi nhớ đăng nhập".
//   - Cung cấp các hàm để module khác (ví dụ auth.js) sử dụng.
//
// Nguyên tắc an toàn:
//   - TUYỆT ĐỐI KHÔNG lưu mật khẩu (dù là văn bản thuần hay đã mã hóa)
//     vào localStorage/sessionStorage.
//   - Chỉ lưu EMAIL đã đăng nhập để tự động điền lại ở lần sau.
//
// Lưu ý quan trọng về thiết kế:
//   - File này KHÔNG tự tìm checkbox theo ID (không đoán ID).
//     Người gọi phải truyền chính phần tử checkbox vào hàm.
//   - File này KHÔNG tự tạo/sửa giao diện (HTML/CSS).
// ============================================================================

// Khóa dùng để lưu dữ liệu "ghi nhớ" trong localStorage.
// Đổi tên khóa ở đây nếu muốn dùng tên khác.
const KHOA_LUU_TRAI_NGHIEM = "rememberMe";

/**
 * Đọc trạng thái hiện tại của checkbox "Ghi nhớ đăng nhập".
 *
 * @param {HTMLInputElement|null|undefined} phanTuCheckbox
 *        Phần tử <input type="checkbox"> do người gọi truyền vào.
 *        Có thể là null/undefined nếu chưa có checkbox trên giao diện.
 * @returns {boolean} true nếu checkbox đang được tích, ngược lại false.
 */
export function docTrangThaiGhiNho(phanTuCheckbox) {
  // Nếu không có phần tử checkbox thì coi như không ghi nhớ.
  if (!phanTuCheckbox) {
    return false;
  }

  // Trả về đúng trạng thái tích/bỏ tích của checkbox.
  return Boolean(phanTuCheckbox.checked);
}

/**
 * Lấy dữ liệu "ghi nhớ đăng nhập" đã lưu trước đó (nếu có).
 * Chỉ chứa email, KHÔNG bao giờ chứa mật khẩu.
 *
 * @returns {{ email: string } | null}
 *          Đối tượng { email } nếu có dữ liệu hợp lệ, ngược lại null.
 */
export function layDuLieuGhiNho() {
  try {
    // Đọc chuỗi JSON đã lưu trong localStorage.
    const chuoiDa = localStorage.getItem(KHOA_LUU_TRAI_NGHIEM);

    // Chưa từng ghi nhớ gì cả.
    if (!chuoiDa) {
      return null;
    }

    // Chuyển chuỗi JSON thành đối tượng JavaScript.
    const duLieu = JSON.parse(chuoiDa);

    // Chỉ chấp nhận khi có email hợp lệ.
    if (duLieu && typeof duLieu.email === "string" && duLieu.email !== "") {
      return { email: duLieu.email };
    }

    // Dữ liệu hỏng hoặc thiếu email.
    return null;
  } catch (loi) {
    // localStorage có thể bị chặn (chế độ riêng tư) hoặc JSON bị lỗi.
    console.warn("Không đọc được dữ liệu ghi nhớ đăng nhập:", loi);
    return null;
  }
}

/**
 * Ghi nhớ email đăng nhập dựa theo trạng thái checkbox.
 *
 * - Nếu checkbox ĐƯỢC tích: lưu email (không lưu mật khẩu).
 * - Nếu checkbox KHÔNG tích: xóa dữ liệu đã ghi nhớ trước đó.
 *
 * @param {HTMLInputElement|null|undefined} phanTuCheckbox
 *        Phần tử checkbox "Ghi nhớ đăng nhập" do người gọi truyền vào.
 * @param {string} email
 *        Email của người dùng vừa đăng nhập thành công.
 * @returns {boolean} true nếu đã lưu, false nếu đã xóa/không lưu.
 */
export function luuGhiNhoDangNhap(phanTuCheckbox, email) {
  // Kiểm tra người dùng có chọn "ghi nhớ" hay không.
  const coGhiNho = docTrangThaiGhiNho(phanTuCheckbox);

  // Người dùng KHÔNG muốn ghi nhớ -> xóa dữ liệu cũ.
  if (!coGhiNho) {
    xoaGhiNhoDangNhap();
    return false;
  }

  // Không có email hợp lệ thì không lưu gì.
  if (typeof email !== "string" || email.trim() === "") {
    return false;
  }

  try {
    // CHỈ lưu email. Không lưu mật khẩu vì lý do an toàn.
    localStorage.setItem(
      KHOA_LUU_TRAI_NGHIEM,
      JSON.stringify({ email: email.trim() }),
    );
    return true;
  } catch (loi) {
    // Một số trình duyệt có thể chặn localStorage.
    console.warn("Không lưu được ghi nhớ đăng nhập:", loi);
    return false;
  }
}

/**
 * Xóa dữ liệu "ghi nhớ đăng nhập" khỏi localStorage.
 *
 * @returns {void}
 */
export function xoaGhiNhoDangNhap() {
  try {
    localStorage.removeItem(KHOA_LUU_TRAI_NGHIEM);
  } catch (loi) {
    console.warn("Không xóa được ghi nhớ đăng nhập:", loi);
  }
}

/**
 * Hàm tiện ích: tự động điền lại email và tích sẵn checkbox khi mở trang.
 * Chỉ điền email, KHÔNG điền mật khẩu.
 *
 * @param {HTMLInputElement|null|undefined} phanTuEmail
 *        Ô nhập email trên form đăng nhập.
 * @param {HTMLInputElement|null|undefined} phanTuCheckbox
 *        Checkbox "Ghi nhớ đăng nhập".
 * @returns {void}
 */
export function tuDongDienGhiNho(phanTuEmail, phanTuCheckbox) {
  // Lấy dữ liệu đã lưu (nếu có).
  const duLieu = layDuLieuGhiNho();

  // Không có gì để điền.
  if (!duLieu) {
    return;
  }

  // Điền lại email vào ô nhập (nếu ô đó tồn tại).
  if (phanTuEmail) {
    phanTuEmail.value = duLieu.email;
  }

  // Tích sẵn checkbox cho khớp với trạng thái đã ghi nhớ.
  if (phanTuCheckbox) {
    phanTuCheckbox.checked = true;
  }
}
