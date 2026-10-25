/*
 * MOVIEF - MEMBERSHIP.JS
 *
 * 1. FAQ Accordion
 * 2. Chọn gói hội viên
 * 3. Lấy ID người dùng
 * 4. Gọi backend tạo URL thanh toán VNPay
 * 5. Chuyển hướng sang VNPay Sandbox
 */

"use strict";

import {
  ACCESS_MESSAGES,
  formatMembershipDate,
  getMembershipSnapshot,
} from "./access.js";

const PAYMENT_API = "http://localhost:3002";

document.addEventListener("DOMContentLoaded", () => {
  initFaqAccordion();
  initMembershipPlans();
  initMembershipStatus();
});

/* =====================================================
   0. TRẠNG THÁI HỘI VIÊN + KẾT QUẢ THANH TOÁN
===================================================== */

function setMembershipStatusCard({
  icon,
  label,
  detail,
  action,
  actionHref,
  tone = "default",
}) {
  const card = document.querySelector("#membershipStatusCard");
  const iconEl = document.querySelector("#membershipStatusIcon");
  const labelEl = document.querySelector("#membershipStatusLabel");
  const detailEl = document.querySelector("#membershipStatusDetail");
  const actionEl = document.querySelector("#membershipStatusAction");

  if (!card) return;

  if (iconEl) iconEl.textContent = icon || "workspace_premium";
  if (labelEl) labelEl.textContent = label || "";
  if (detailEl) detailEl.textContent = detail || "";

  if (actionEl) {
    const showAction = Boolean(action);
    actionEl.classList.toggle("hidden", !showAction);
    actionEl.classList.toggle("inline-flex", showAction);
    if (showAction) {
      actionEl.textContent = action;
      actionEl.href = actionHref || "#membership-plans";
    }
  }

  if (actionEl && actionHref === "/login" && !actionEl.dataset.redirectBound) {
    actionEl.dataset.redirectBound = "1";
    actionEl.addEventListener("click", () => {
      sessionStorage.setItem("redirectAfterLogin", window.location.href);
    });
  }

  card.dataset.tone = tone;
  card.classList.toggle("border-green-500/30", tone === "active");
  card.classList.toggle("bg-green-500/[0.06]", tone === "active");
  card.classList.toggle("border-amber-500/30", tone === "warning");
  card.classList.toggle("bg-amber-500/[0.06]", tone === "warning");
  card.classList.toggle("border-red-500/30", tone === "danger");
  card.classList.toggle("bg-red-500/[0.06]", tone === "danger");
}

function paymentResultMessage() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  if (!status) return null;

  const txnRef = params.get("txnRef");
  if (status === "success") {
    return {
      icon: "verified",
      label: "Thanh toán thành công",
      detail: txnRef
        ? `Giao dịch ${txnRef} đã được ghi nhận. Quyền hội viên được cập nhật bên dưới.`
        : "Giao dịch đã được ghi nhận. Quyền hội viên được cập nhật bên dưới.",
      tone: "active",
    };
  }

  return {
    icon: "error",
    label: "Thanh toán chưa hoàn tất",
    detail:
      "Giao dịch chưa được xác nhận thành công. Bạn có thể chọn lại gói và thử thanh toán lại.",
    tone: "danger",
  };
}

async function initMembershipStatus() {
  let snapshot;
  try {
    snapshot = await getMembershipSnapshot({ force: true });
  } catch (error) {
    console.error("[membership] Không đọc được trạng thái hội viên:", error);
    setMembershipStatusCard({
      icon: "cloud_off",
      label: "Không kiểm tra được trạng thái hội viên",
      detail: ACCESS_MESSAGES.membershipUnknown,
      tone: "warning",
    });
    return;
  }

  const result = paymentResultMessage();

  if (snapshot.status === "guest") {
    setMembershipStatusCard({
      icon: "login",
      label: "Bạn chưa đăng nhập",
      detail:
        "Đăng nhập để kiểm tra quyền hội viên và mua hoặc gia hạn gói VIP.",
      action: "Đăng nhập",
      actionHref: "/login",
      tone: "warning",
    });
    return;
  }

  if (snapshot.status === "unknown") {
    setMembershipStatusCard({
      icon: "cloud_off",
      label: "Không kiểm tra được quyền hội viên",
      detail: ACCESS_MESSAGES.membershipUnknown,
      tone: "warning",
    });
    return;
  }

  if (snapshot.status === "disabled") {
    setMembershipStatusCard({
      icon: "block",
      label: "Tài khoản đã bị vô hiệu hóa",
      detail: "Vui lòng liên hệ quản trị viên để được hỗ trợ mở lại tài khoản.",
      tone: "danger",
    });
    return;
  }

  if (snapshot.status === "active") {
    setMembershipStatusCard({
      icon: result?.icon || "verified",
      label: result?.label || "Hội viên VIP đang hoạt động",
      detail:
        result?.detail ||
        `${snapshot.planName} có hiệu lực đến ${formatMembershipDate(
          snapshot.expiresAt,
        )}. Bạn có thể xem toàn bộ phim VIP đã phát hành.`,
      action: "Gia hạn",
      actionHref: "#membership-plans",
      tone: "active",
    });
    return;
  }

  if (snapshot.status === "expired") {
    setMembershipStatusCard({
      icon: result?.icon || "history",
      label: result?.label || "Gói hội viên đã hết hạn",
      detail: result?.detail || ACCESS_MESSAGES.membershipExpired,
      action: "Gia hạn ngay",
      actionHref: "#membership-plans",
      tone: "warning",
    });
    return;
  }

  setMembershipStatusCard({
    icon: result?.icon || "workspace_premium",
    label: result?.label || "Bạn chưa có gói hội viên",
    detail:
      result?.detail ||
      "Chọn một gói bên dưới để xem các phim được đánh dấu VIP.",
    action: "Chọn gói",
    actionHref: "#membership-plans",
    tone: "default",
  });
}

/* =====================================================
   1. FAQ ACCORDION
===================================================== */

function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const button = item.querySelector(".faq-question");

    if (!button) return;

    button.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");

      faqItems.forEach((faq) => {
        faq.classList.remove("open");

        const faqButton = faq.querySelector(".faq-question");

        if (faqButton) {
          faqButton.setAttribute("aria-expanded", "false");
        }
      });

      if (!wasOpen) {
        item.classList.add("open");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });
}

/* =====================================================
   2. CHỌN GÓI HỘI VIÊN
===================================================== */

function initMembershipPlans() {
  const planButtons = document.querySelectorAll(".select-plan");

  if (!planButtons.length) {
    console.warn("MovieF: Không tìm thấy nút chọn gói.");
    return;
  }

  planButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled) return;

      const plan = {
        id: button.dataset.planId,
        name: button.dataset.planName,
        price: Number(button.dataset.planPrice),
        duration: button.dataset.planDuration,
      };

      if (
        !plan.id ||
        !plan.name ||
        !Number.isFinite(plan.price) ||
        plan.price <= 0
      ) {
        showMessage("Thông tin gói VIP không hợp lệ.", "error");
        return;
      }

      const userId = getCurrentUserId();

      if (!userId) {
        showMessage("Vui lòng đăng nhập trước khi mua gói VIP.", "error");
        return;
      }

      window.dispatchEvent(
        new CustomEvent("movief:membership-plan-selected", {
          detail: plan,
        }),
      );

      const confirmed = window.confirm(
        `Xác nhận chọn ${plan.name}?\n` +
          `Giá hiển thị: ${plan.price.toLocaleString("vi-VN")} VNĐ\n` +
          `Thời hạn: ${plan.duration}`,
      );

      if (!confirmed) return;

      await createMembershipPayment(button, userId, plan);
    });
  });
}

/* =====================================================
   3. LẤY ID NGƯỜI DÙNG
===================================================== */

function getCurrentUserId() {
  const possibleKeys = ["userId", "user_id", "currentUser", "user"];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);

    if (!value) continue;

    if (key === "userId" || key === "user_id") {
      if (value.trim()) return value.trim();
      continue;
    }

    try {
      const user = JSON.parse(value);

      if (!user || typeof user !== "object") continue;

      const id = user.id ?? user.userId ?? user.user_id;

      if (id !== undefined && id !== null && String(id).trim()) {
        return String(id);
      }
    } catch {
      // Bỏ qua giá trị không phải JSON.
    }
  }

  return null;
}

/* =====================================================
   4. TẠO ĐƠN VÀ CHUYỂN SANG VNPAY
===================================================== */

async function createMembershipPayment(button, userId, plan) {
  const originalHTML = button.innerHTML;

  try {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.textContent = "Đang kết nối VNPay...";

    const response = await fetch(`${PAYMENT_API}/api/payments/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        userId,
        planId: plan.id,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message ||
          `Không thể tạo đơn thanh toán (HTTP ${response.status}).`,
      );
    }

    const paymentUrl = result.data?.paymentUrl;
    const order = result.data?.order;
    const accessToken = result.data?.accessToken;

    if (!order || !accessToken) {
      throw new Error("Backend không trả về thông tin đơn hàng.");
    }

    const accessByUser = JSON.parse(localStorage.getItem("moviefOrderAccess") || "{}");
    accessByUser[String(userId)] = accessToken;
    localStorage.setItem("moviefOrderAccess", JSON.stringify(accessByUser));

    if (
      typeof paymentUrl !== "string" ||
      !paymentUrl.startsWith("https://sandbox.vnpayment.vn/")
    ) {
      throw new Error(
        "Backend chưa trả về URL VNPay Sandbox hợp lệ. Kiểm tra paymentService.js.",
      );
    }

    console.log("Đã tạo đơn VNPay:", {
      txnRef: order.txnRef,
      status: order.status,
      amount: order.amount,
    });

    // Chuyển trình duyệt sang trang thanh toán VNPay.
    window.location.assign(paymentUrl);
  } catch (error) {
    console.error("Lỗi thanh toán MovieF:", error);

    showMessage(
      error.message || "Không thể kết nối máy chủ thanh toán.",
      "error",
    );

    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = originalHTML;
  }
}

/* =====================================================
   5. HIỂN THỊ THÔNG BÁO
===================================================== */

function showMessage(message, type = "info") {
  let element = document.querySelector("#membership-message");

  if (!element) {
    element = document.createElement("div");
    element.id = "membership-message";
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");

    const container =
      document.querySelector(".membership-container") ||
      document.querySelector("main") ||
      document.body;

    container.prepend(element);
  }

  element.textContent = message;
  element.dataset.type = type;
}
