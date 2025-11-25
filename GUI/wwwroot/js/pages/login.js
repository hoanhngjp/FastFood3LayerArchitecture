import { login } from '../services/authService.js';

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
    displayMessage('', false); // Xóa thông báo cũ

    const email = emailEl.value;
    const password = passwordEl.value;

    // Khóa nút khi đang xử lý
    loginButtonEl.disabled = true;
    loginButtonEl.textContent = 'Đang đăng nhập...';

    try {
        // Gọi API
        const data = await login(email, password);

        // Thành công
        displayMessage("Đăng nhập thành công!", false);

        window.location.href = '/Home/Index';

    } catch (error) {
        console.log("Lỗi nhận được:", error.message);

        // --- XỬ LÝ LỖI DỰA TRÊN MESSAGE CỦA BACKEND ---

        const errorMsg = error.message;
        let userMessage = "";

        // Backend trả về chính xác chuỗi "Invalid credentials"
        if (errorMsg === "Invalid credentials") {
            // Vì backend gộp chung lỗi nên ta báo chung
            userMessage = "Sai email hoặc mật khẩu (hoặc tài khoản chưa tồn tại).";
        }
        else if (errorMsg.includes("Missing required fields")) {
            userMessage = "Vui lòng nhập đầy đủ thông tin.";
        }
        else {
            userMessage = "Có lỗi xảy ra: " + errorMsg;
        }

        displayMessage(userMessage, true);

    } finally {
        // Mở lại nút
        loginButtonEl.disabled = false;
        loginButtonEl.textContent = 'Đăng nhập';
    }
}

if (loginFormEl) {
    loginFormEl.addEventListener('submit', handleLogin);
}