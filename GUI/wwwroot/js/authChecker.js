import { getSession, logout } from './services/authService.js';

const AUTH_CONTAINER_ID = 'auth-status-container';
/**
 * Tạo markup HTML cho trạng thái ĐÃ ĐĂNG NHẬP
 * @param {object} userInfo - Thông tin người dùng (Email, Role, FullName)
 */
function createLoggedInMarkup(userInfo) {
    // Backend GetSessionInfo chưa trả về FullName. 
    // Tạm thời lấy tên từ Email. Nếu Backend sửa để trả về FullName, code sẽ tự động ưu tiên.
    const userNameFromEmail = userInfo.email ? userInfo.email.split('@')[0] : 'Người dùng';

    // ⭐️ SỬ DỤNG EMAIL VÀO VAI TRÒ FULL NAME ⭐️
    // Bạn cần Backend trả về 'fullName' hoặc 'FullName'
    const fullName = userInfo.fullName || userInfo.FullName || userNameFromEmail;
    const email = userInfo.email || 'Email không rõ';

    return `
        <div class="dropdown">
            <button class="btn btn-outline-warning dropdown-toggle" type="button" id="userMenuToggle" data-bs-toggle="dropdown" aria-expanded="true" title="Menu người dùng">
                <i class="bi bi-person-circle fs-5"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="userMenuToggle">
                <li><strong class="dropdown-item-text"><i class="bi bi-person me-2"></i> ${fullName}</strong></li>
                <li><small class="dropdown-item-text text-muted ps-3">${email}</small></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="/Account/Index"><i class="bi bi-gear me-2"></i> Profile</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" id="logout-btn"><i class="bi bi-box-arrow-right me-2"></i> Logout</a></li>
            </ul>
        </div>
    `;
}

/**
 * Tạo markup HTML cho trạng thái CHƯA ĐĂNG NHẬP
 */
function createLoggedOutMarkup() {
    return `
        <button class="btn btn-outline-warning" onclick="window.location.href='/Home/Login'">Login</button>
        <button class="btn btn-warning" onclick="window.location.href='/Home/Registry'">Registry</button>
    `;
}


/**
 * Hàm chính kiểm tra trạng thái và render giao diện
 */
async function checkAuthStatus() {
    

    const container = document.getElementById(AUTH_CONTAINER_ID);  

    if (!container) {
        console.error('Lỗi: Không tìm thấy phần tử auth-status-container.');
        return;
    }

    // ... (logic hiển thị loading) ...

    try {
        const userInfo = await getSession();
        const IS_ADMIN_PAGE = window.location.pathname.startsWith('/Admin');

        if (userInfo && userInfo.userID) {
            // Kiểm tra vai trò Admin (Giả định vai trò được trả về là 'Admin')
            const userRole = userInfo.role || userInfo.Role;

            if (IS_ADMIN_PAGE && userRole !== 'Admin') {
                // Người dùng đã đăng nhập NHƯNG không phải Admin -> Chuyển hướng
                console.warn("Người dùng không có quyền Admin, chuyển hướng.");
                window.location.href = '/Home/Index'; // Hoặc trang chủ
                return; // Ngừng thực thi
            }

            // Nếu là Admin hợp lệ hoặc đang ở trang công khai
            container.innerHTML = createLoggedInMarkup(userInfo);
            // ... (gắn sự kiện logout) ...
            document.getElementById('logout-btn').addEventListener('click', handleLogout);

        } else {
            // Chưa đăng nhập
            container.innerHTML = createLoggedOutMarkup();
            if (IS_ADMIN_PAGE) {
                // Chưa đăng nhập và đang cố truy cập trang Admin -> Chuyển hướng đến Đăng nhập
                window.location.href = '/Home/Login';
            }
        }
    } catch (error) {
        // ...
    }
}

/**
 * Xử lý sự kiện Logout
 */
async function handleLogout() {
    try {
        await logout();
        // Sau khi logout thành công, chuyển hướng về trang chủ hoặc load lại trang
        window.location.href = '/Home/Index';
    } catch (error) {
        console.error("Lỗi khi đăng xuất:", error);
        alert("Đăng xuất không thành công, vui lòng thử lại!");
    }
}

checkAuthStatus();