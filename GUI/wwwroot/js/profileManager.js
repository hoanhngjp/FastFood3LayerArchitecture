/**
 * js/profileManager.js
 * Tải thông tin phiên (session) và xử lý Đăng xuất.
 * Vô hiệu hóa cập nhật profile/mật khẩu vì không có API.
 */
import { authService } from './services/authService.js';

const profileUpdateForm = document.getElementById('profile-update-form');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');
const profileTab = document.getElementById('profile-tab');

// Thẻ hiển thị thông tin profile
const inputEmail = document.getElementById('inputEmail');
const inputRole = document.getElementById('inputRole');


/**
 * Hàm tải Profile bằng cách gọi API /auth/session
 */
async function loadProfileData() {
    try {
        const info = await authService.getSessionInfo();

        // Điền dữ liệu vào form (Chỉ điền Email và Role)
        if (inputEmail) {
            inputEmail.value = info.email || info.Email || 'Không rõ';
            inputEmail.disabled = true; // Không cho phép sửa Email
        }
        if (inputRole) {
            inputRole.value = info.role || info.Role || 'Không rõ';
            inputRole.disabled = true;
        }

        console.log("Đã tải thông tin Session:", info);

        // --- VÔ HIỆU HÓA CÁC INPUT KHÔNG CÓ API CẬP NHẬT ---
        // Giả định các input khác như Tên, SĐT không có (vì không có API PUT /me/profile)
        const inputName = document.getElementById('inputName');
        const inputPhone = document.getElementById('inputPhone');
        if (inputName) inputName.disabled = true;
        if (inputPhone) inputPhone.disabled = true;

    } catch (error) {
        console.error("Lỗi khi tải thông tin phiên làm việc (GET /auth/session):", error.message);
        if (inputEmail) inputEmail.value = 'Lỗi tải dữ liệu';
    }
}

/**
 * Xử lý submit Profile (Chỉ cảnh báo)
 */
if (profileUpdateForm) {
    profileUpdateForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Không có API để xử lý
        if (newPassword?.value) {
            alert('Chức năng Đổi mật khẩu bị vô hiệu hóa vì thiếu API (POST /auth/change-password).');
        } else {
            alert('Chức năng cập nhật thông tin cá nhân bị vô hiệu hóa vì thiếu API (PUT /me/profile).');
        }
    });
}

// Khởi tạo
if (profileTab) {
    profileTab.addEventListener('show.bs.tab', loadProfileData);
    if (profileTab.classList.contains('active')) {
        loadProfileData();
    }
}

// Bổ sung xử lý Đăng xuất
const logoutLink = document.querySelector('a[href="/Home/Logout"]');
if (logoutLink) {
    logoutLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            try {
                // Sử dụng API POST /auth/logout
                await authService.logout();
                alert('Đăng xuất thành công!');
                // Chuyển hướng về trang chủ hoặc đăng nhập sau khi xóa token
                window.location.href = '/Home/Index';
            } catch (error) {
                alert(`Đăng xuất thất bại: ${error.message}`);
                // Vẫn chuyển hướng để người dùng thoát khỏi trang My Account
                window.location.href = '/Home/Index';
            }
        }
    });
}