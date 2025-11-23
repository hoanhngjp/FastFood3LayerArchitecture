// File: wwwroot/js/login.js

import { login } from './authService.js'; // Import hàm login từ service

const loginFormEl = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const alertMessageEl = document.getElementById('alert-message');
const loginButtonEl = document.getElementById('login-button');

/**
 * Hiển thị thông báo lỗi hoặc thành công trên giao diện
 * @param {string} message - Nội dung thông báo
 * @param {boolean} isError - True nếu là lỗi (màu đỏ), False nếu là thành công (màu xanh/đen)
 */
function displayMessage(message, isError = true) {
    if (alertMessageEl) {
        alertMessageEl.textContent = message;
        alertMessageEl.style.color = isError ? 'red' : 'green';
        alertMessageEl.style.display = 'block';
    } else {
        // Fallback nếu không tìm thấy element (dùng alert)
        alert(message);
    }
}

/**
 * Xử lý sự kiện khi form đăng nhập được submit
 */
async function handleLogin(e) {
    e.preventDefault();
    displayMessage('', false); // Xóa thông báo cũ

    // Thu thập dữ liệu
    const email = emailEl.value;
    const password = passwordEl.value;

    // Vô hiệu hóa nút để tránh gửi nhiều lần
    loginButtonEl.disabled = true;
    loginButtonEl.textContent = 'Đang xử lý...';

    try {
        // 🌟 GỌI SERVICE API 🌟
        const data = await login(email, password);

        // Đăng nhập thành công
        displayMessage("Đăng nhập thành công! Đang chuyển hướng...", false);

        // Giả định API trả về token hoặc thông tin cần thiết
        if (data.token) {
            localStorage.setItem("token", data.token);
        }

        // Chuyển hướng người dùng (Thay thế 'orders.html' bằng URL thực tế của bạn)
        // Ví dụ: Trang chủ hoặc trang đã chọn trước đó
        window.location.href = '/Home/Index'; // Hoặc đường dẫn khác

    } catch (error) {
        // Đăng nhập thất bại (Lỗi từ service.js đã throw)
        const errorMessage = error.message.includes("401")
            ? "Sai email hoặc mật khẩu!"
            : `Lỗi server, thử lại sau. (${error.message})`;

        displayMessage(errorMessage, true);

    } finally {
        // Bật lại nút sau khi xử lý xong
        loginButtonEl.disabled = false;
        loginButtonEl.textContent = 'Đăng nhập';
    }
}

// Gắn sự kiện submit vào form
if (loginFormEl) {
    loginFormEl.addEventListener('submit', handleLogin);
}