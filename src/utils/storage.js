import api from "../js/api";
import { getSessionUser, requireAuth } from "../js/custumer/auth-session";

export const kiemTraDangNhapAdmin = async () => {
  const user = getSessionUser();

  console.log("CURRENT USER:", user);

  // Chưa đăng nhập -> nhớ trang đích rồi về trang đăng nhập.
  if (!requireAuth({ message: "Vui lòng đăng nhập để tiếp tục." })) return false;

  try {
    const idRole = String(user.roleId);

    const role = await api.get(`/roles/${idRole}`);

    console.log("ROLE:", role);

    const roleName = role.name?.trim().toLowerCase();

    console.log("ROLE NAME:", roleName);

    if (roleName !== "admin" && roleName !== "staff") {
      console.log("❌ Không có quyền");
      window.location.href = "/";
      return false;
    }

    console.log("✅ ĐƯỢC PHÉP VÀO ADMIN");

    return true;
  } catch (error) {
    console.error("❌ Lỗi kiểm tra quyền:", error);
    return false;
  }
};
