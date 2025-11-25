import { getSession, logout } from './services/authService.js';
import { clearCart } from './services/cartService.js';

const AUTH_CONTAINER_ID = 'auth-status-container';

function createLoggedInMarkup(userInfo) {
    const userNameFromEmail = userInfo.email ? userInfo.email.split('@')[0] : 'Người dùng';
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

function createLoggedOutMarkup() {
    return `
        <button class="btn btn-outline-warning" onclick="window.location.href='/Home/Login'">Login</button>
        <button class="btn btn-warning" onclick="window.location.href='/Home/Registry'">Registry</button>
    `;
}

async function handleLogout() {
    try {
        await logout();
        clearCart();
        document.dispatchEvent(new Event('cartUpdated'));
        window.location.href = '/Home/Index';
    } catch (error) {
        console.error("Lỗi khi đăng xuất:", error);
        alert("Đăng xuất không thành công, vui lòng thử lại!");
    }
}

async function checkAuthStatus() {
    const container = document.getElementById(AUTH_CONTAINER_ID);

    if (!container) {
        attachAccountLogoutEvent();
        return;
    }

    try {
        const userInfo = await getSession();
        const IS_ADMIN_PAGE = window.location.pathname.startsWith('/Admin');
        // Xác định trang thanh toán (giả định URL chứa /checkout)
        const IS_CHECKOUT_PAGE = window.location.pathname.toLowerCase().includes('/checkout');


        if (userInfo && userInfo.userID) {
            const userRole = userInfo.role || userInfo.Role;

            if (IS_ADMIN_PAGE && userRole !== 'Admin') {
                console.warn("Người dùng không có quyền Admin, chuyển hướng.");
                window.location.href = '/Home/Index';
                return;
            }

            container.innerHTML = createLoggedInMarkup(userInfo);
            document.getElementById('logout-btn').addEventListener('click', handleLogout);

        } else {
            // Trường hợp CHƯA ĐĂNG NHẬP
            container.innerHTML = createLoggedOutMarkup();

            if (IS_ADMIN_PAGE) {
                // Buộc đăng nhập nếu đang ở trang Admin
                window.location.href = '/Home/Login';
                return;
            }

            // ⭐ LOGIC BẮT BUỘC ĐĂNG NHẬP CHO TRANG THANH TOÁN (ĐÃ THÊM ALERT) ⭐
            if (IS_CHECKOUT_PAGE) {
                console.warn("Chưa đăng nhập, chuyển hướng đến trang Đăng nhập.");

                // ⭐ THÊM ALERT TRƯỚC KHI CHUYỂN HƯỚNG ⭐
                alert("Vui lòng đăng nhập để tiến hành thanh toán.");

                // Lưu lại URL hiện tại để chuyển hướng quay lại sau khi đăng nhập thành công
                const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/Home/Login?ReturnUrl=${redirectUrl}`;
                return;
            }
        }
    } catch (error) {
        console.error("Lỗi kiểm tra phiên:", error);
        const IS_CHECKOUT_PAGE_ON_ERROR = window.location.pathname.toLowerCase().includes('/checkout');
        // Xử lý khi có lỗi API mà đang ở trang Checkout
        if (IS_CHECKOUT_PAGE_ON_ERROR) {
            alert("Vui lòng đăng nhập để tiến hành thanh toán.");
            const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/Home/Login?ReturnUrl=${redirectUrl}`;
        }
    }

    attachAccountLogoutEvent();
}

function attachAccountLogoutEvent() {
    const accountLogoutBtn = document.getElementById('account-logout-btn');

    if (accountLogoutBtn) {
        accountLogoutBtn.addEventListener('click', handleLogout);
        console.log('Đã gắn sự kiện Đăng xuất cho nút thanh bên trang cá nhân.');
    }
}

checkAuthStatus();