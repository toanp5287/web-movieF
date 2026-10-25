const API = "http://localhost:3002";
const params = new URLSearchParams(window.location.search);
let txnRef = params.get("txnRef");
let accessToken = null;
const title = document.querySelector("#resultTitle");
const intro = document.querySelector("#resultIntro");
const notice = document.querySelector("#resultNotice");
const details = document.querySelector("#paymentDetails");
const icon = document.querySelector("#resultIcon");
const retryButton = document.querySelector("#retryResult");
const retryPayment = document.querySelector("#retryPayment");
const watchMovies = document.querySelector("#watchMovies");
let loading = false;

function addRow(label, value) {
  if (value === null || value === undefined || value === "") return;
  const row = document.createElement("div");
  row.className = "row";
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  row.append(term, description);
  details.append(row);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN");
}

async function loadResult() {
  if (loading) return;
  loading = true;
  retryButton.hidden = true;
  retryButton.disabled = true;
  const ticket = params.get("ticket");
  const saved = sessionStorage.getItem("moviefPaymentResult");
  if (ticket) {
    try {
      const ticketResponse = await fetch(`${API}/api/payments/return-ticket?ticket=${encodeURIComponent(ticket)}`, { cache: "no-store" });
      const ticketResult = await ticketResponse.json();
      if (!ticketResponse.ok || !ticketResult.success) throw new Error("Phiên kết quả đã hết hạn.");
      txnRef = ticketResult.data.txnRef;
      accessToken = ticketResult.data.accessToken;
      sessionStorage.setItem("moviefPaymentResult", JSON.stringify({ txnRef, accessToken }));
      history.replaceState(null, "", `/payment-result?txnRef=${encodeURIComponent(txnRef)}`);
    } catch (error) {
      title.textContent = "Không thể xác minh đơn hàng";
      intro.textContent = "Chưa kết nối được máy chủ thanh toán. Hãy thử tải lại kết quả.";
      notice.hidden = false;
      notice.textContent = error.message;
      retryButton.hidden = false;
      retryButton.disabled = false;
      loading = false;
      return;
    }
  } else if (saved) {
    try {
      const previous = JSON.parse(saved);
      txnRef = txnRef || previous.txnRef;
      accessToken = previous.accessToken;
    } catch {
      sessionStorage.removeItem("moviefPaymentResult");
    }
  }
  if (!txnRef || !accessToken) {
    const verificationFailed = params.get("verification") === "error";
    title.textContent = verificationFailed ? "Chưa xác minh được thanh toán" : "Không thể xác minh đơn hàng";
    intro.textContent = verificationFailed
      ? "Máy chủ chưa xác minh được phản hồi từ VNPay. Không thể coi giao dịch là thành công."
      : "Thiếu thông tin truy cập đơn. Hãy mở kết quả từ trình duyệt đã tạo đơn thanh toán.";
    notice.hidden = false;
    notice.textContent = "Trạng thái thanh toán chỉ được xác định từ đơn hàng phía máy chủ.";
    retryPayment.hidden = false;
    loading = false;
    return;
  }
  try {
    const response = await fetch(`${API}/api/payments/result?txnRef=${encodeURIComponent(txnRef)}`, {
      headers: { "x-order-access-token": accessToken },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Không tải được đơn hàng.");

    const order = result.data;
    const paid = order.status === "PAID";
    title.textContent = paid ? "Thanh toán thành công!" : order.status === "PENDING" ? "Đang chờ xác nhận thanh toán" : "Thanh toán chưa thành công";
    intro.textContent = paid
      ? "Đăng ký hoặc gia hạn hội viên Premium MovieF thành công."
      : order.status === "PENDING"
        ? "Đơn hàng đang chờ kết quả xác nhận từ VNPay. Tải lại trang sau ít phút để cập nhật."
        : "Giao dịch bị hủy hoặc thất bại. Hội viên chưa được kích hoạt.";
    if (!paid) icon.classList.add("failed");
    icon.textContent = paid ? "✓" : order.status === "PENDING" ? "…" : "×";
    watchMovies.hidden = !paid;

    addRow("Gói hội viên", order.planName);
    addRow("Số tiền", `${Number(order.amount).toLocaleString("vi-VN")} ₫`);
    addRow("Mã giao dịch MovieF", order.txnRef);
    addRow("Mã giao dịch VNPay", order.vnpTransactionNo);
    addRow("Phương thức", "VNPay");
    addRow("Trạng thái", paid ? "Đã thanh toán" : order.status === "PENDING" ? "Đang xử lý" : "Thất bại / đã hủy");
    addRow("Thời điểm thanh toán", formatDate(order.paidAt));
    addRow("Ngày bắt đầu hội viên", formatDate(order.membershipStartsAt));
    addRow("Ngày hết hạn hội viên", formatDate(order.membershipExpiresAt));
    details.hidden = false;

    if (paid) {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      const accessByUser = JSON.parse(localStorage.getItem("moviefOrderAccess") || "{}");
      if (currentUser?.id) {
        accessByUser[String(currentUser.id)] = accessToken;
        localStorage.setItem("moviefOrderAccess", JSON.stringify(accessByUser));
      }
      window.dispatchEvent(new CustomEvent("movief:membership-updated"));
    } else if (order.status === "FAILED") {
      retryPayment.hidden = false;
    }
    if (order.status === "PENDING") retryButton.hidden = false;
  } catch (error) {
    title.textContent = "Không thể tải kết quả thanh toán";
    intro.textContent = "Máy chủ MovieF tạm thời không truy cập được hoặc chưa trả về kết quả.";
    notice.hidden = false;
    notice.textContent = error.message;
    retryButton.hidden = false;
    retryButton.disabled = false;
    retryPayment.hidden = false;
    watchMovies.hidden = true;
  } finally {
    loading = false;
    retryButton.disabled = false;
  }
}

retryButton.addEventListener("click", loadResult);
loadResult();
