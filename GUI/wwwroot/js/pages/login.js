import { login, getSession } from '../services/authService.js';

const loginFormEl = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const alertMessageEl = document.getElementById('alert-message');
const loginButtonEl = document.getElementById('login-button');

function displayMessage(message, isError = true) {
    if (alertMessageEl) {
        alertMessageEl.textContent = message;
        alertMessageEl.style.color = isError ? 'red' : 'green';
        alertMessageEl.style.display = 'block';
    } else {
        alert(message);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    displayMessage('', false);

    const email = emailEl.value;
    const password = passwordEl.value;

    loginButtonEl.disabled = true;
    loginButtonEl.textContent = 'Đang xử lý...';

    try {
        // 1. Gọi API Login (Backend set cookie)
        await login(email, password);

        // 2. Lấy thông tin Session để kiểm tra Role
        // getSession() sẽ gọi API /auth/session, cookie vừa set sẽ được gửi đi tự động
        const user = await getSession();

        displayMessage("Đăng nhập thành công! Đang chuyển hướng...", false);

        // 3. Kiểm tra Role và chuyển hướng
        if (user && user.role) {
            const role = user.role.toLowerCase();

            if (role === 'admin') {
                window.location.href = '/Admin/Dashboard'; // Đường dẫn trang Admin
            } else if (role === 'manager') {
                window.location.href = '/Manager/Dashboard'; // Ví dụ trang Manager
            } else {
                // Customer hoặc role khác
                // Kiểm tra xem có ReturnUrl không (để redirect lại trang cũ nếu cần)
                const urlParams = new URLSearchParams(window.location.search);
                const returnUrl = urlParams.get('ReturnUrl');

                if (returnUrl) {
                    window.location.href = decodeURIComponent(returnUrl);
                } else {
                    window.location.href = '/Home/Index';
                }
            }
        } else {
            // Fallback nếu không lấy được role
            window.location.href = '/Home/Index';
        }

    } catch (error) {
        console.error("Lỗi login:", error);

        let userMessage = "Đăng nhập thất bại.";
        const errorMsg = error.message || "";

        if (errorMsg === "Invalid credentials" || errorMsg.includes("401")) {
            userMessage = "Sai email hoặc mật khẩu.";
        } else if (errorMsg.includes("Missing")) {
            userMessage = "Vui lòng nhập đầy đủ thông tin.";
        } else {
            userMessage = "Lỗi hệ thống: " + errorMsg;
        }

        displayMessage(userMessage, true);

    } finally {
        loginButtonEl.disabled = false;
        loginButtonEl.textContent = 'Đăng nhập';
    }
}

if (loginFormEl) {
    loginFormEl.addEventListener('submit', handleLogin);
}