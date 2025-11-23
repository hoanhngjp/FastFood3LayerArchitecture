// File: wwwroot/js/signup.js

import { signup } from './authService.js'; // Import hàm signup từ service

const signupFormEl = document.getElementById('registerForm');
const fullNameEl = document.getElementById('fullName');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const confirmPasswordEl = document.getElementById('confirmPassword');
const alertMessageEl = document.getElementById('alert-message-signup');
const signupButtonEl = document.querySelector('#registerForm button[type="submit"]');


/**
 * Hiển thị thông báo lỗi hoặc thành công trên giao diện
 */
function displayMessage(message, isError = true) {
    if (alertMessageEl) {
        alertMessageEl.textContent = message;
        alertMessageEl.style.color = isError ? 'red' : 'green';
        alertMessageEl.style.display = 'block';
    }
}

/**
 * Xử lý sự kiện khi form đăng ký được submit
 */
async function handleSignup(e) {
    e.preventDefault();
    displayMessage('', false); // Xóa thông báo cũ

    const password = passwordEl.value;
    const confirmPassword = confirmPasswordEl.value;

    // 1. Kiểm tra mật khẩu khớp
    if (password !== confirmPassword) {
        displayMessage("Lỗi: Mật khẩu xác nhận không khớp.", true);
        return;
    }

    // Thu thập dữ liệu
    const fullName = fullNameEl.value;
    const email = emailEl.value;

    // Vô hiệu hóa nút
    signupButtonEl.disabled = true;
    signupButtonEl.textContent = 'Đang đăng ký...';

    try {
        // 2. GỌI SERVICE API
        // Thay đổi role từ 'USER' thành 'user' để đảm bảo tính nhất quán (Case-sensitivity)
        await signup(fullName, email, password, 'User');

        // Đăng ký thành công
        displayMessage("Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.", false);

        // Tùy chọn: Chuyển hướng người dùng đến trang đăng nhập sau 2 giây
        setTimeout(() => {
            window.location.href = '/Home/Login';
        }, 2000);

    } catch (error) {
        // Đăng ký thất bại
        let errorMessage;
        const errorString = error.message;

        if (errorString.includes("409")) {
            // Lỗi Email đã tồn tại (Conflict)
            errorMessage = "Email này đã được sử dụng. Vui lòng chọn email khác.";
        } else if (errorString.includes("400")) {
            // Lỗi 400 Bad Request: Thường là lỗi validation
            // Ví dụ: Mật khẩu quá yếu, Email sai định dạng.
            errorMessage = "Lỗi xác thực dữ liệu. Vui lòng kiểm tra lại mật khẩu (độ dài, ký tự đặc biệt) hoặc định dạng Email.";
        } else {
            // Lỗi chung
            errorMessage = `Lỗi đăng ký: ${errorString}.`;
        }

        // Dựa trên phân tích database đã lưu (Lỗi Backend trả 400 dù thành công)
        // Nếu lỗi là 400, chúng ta sẽ xem xét thông báo thành công.
        // Tuy nhiên, không có thông tin chi tiết về Response body, nên
        // TỐT NHẤT là hiển thị lỗi 400 là lỗi Validation như trên.

        displayMessage(errorMessage, true);

    } finally {
        // Bật lại nút sau khi xử lý xong
        signupButtonEl.disabled = false;
        signupButtonEl.textContent = 'Đăng ký';
    }
}

// Gắn sự kiện submit vào form
if (signupFormEl) {
    signupFormEl.addEventListener('submit', handleSignup);
}