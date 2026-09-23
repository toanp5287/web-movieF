import api from "../../js/api.js";

export const kiemTraDangNhapAdmin = async () => {
  const currentUser = localStorage.getItem("currentUser");

  console.log("CURRENT USER:", currentUser);

  if (!currentUser) {
    sessionStorage.setItem("redirectAfterLogin", window.location.href);

    window.location.href = "/pages/login.html";
    return false;
  }

  try {
    const user = JSON.parse(currentUser);

    console.log("USER:", user);

    const idRole = String(user.roleId);

    const role = await api.get(`/roles/${idRole}`);

    console.log("ROLE:", role);

    const roleName = role.name?.trim().toLowerCase();

    console.log("ROLE NAME:", roleName);

    if (roleName !== "admin" && roleName !== "staff") {
      console.log("❌ Không có quyền");
      window.location.href = "/pages/home.html";
      return false;
    }

    console.log("✅ ĐƯỢC PHÉP VÀO ADMIN");

    return true;
  } catch (error) {
    console.error("❌ Lỗi kiểm tra quyền:", error);
    return false;
  }
};
