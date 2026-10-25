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

const PAYMENT_API = "http://localhost:3002";

document.addEventListener("DOMContentLoaded", () => {
  initFaqAccordion();
  initMembershipPlans();
});

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
