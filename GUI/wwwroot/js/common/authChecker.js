import { getSession, logout } from '../services/authService.js';
import { clearCart } from '../services/cartService.js';

const AUTH_CONTAINER_ID = 'auth-status-container';

function createLoggedInMarkup(userInfo) {
    const userNameFromEmail = userInfo.email ? userInfo.email.split('@')[0] : 'Người dùng';
    const fullName = userInfo.fullName || userInfo.FullName || userNameFromEmail;
    const email = userInfo.email || 'Email không rõ';
    const role = userInfo.role || userInfo.Role || 'Customer';

    // Tạo menu item dựa trên Role
    let dashboardLink = '';

    if (role === 'Admin') {
        dashboardLink = `<li><a class="dropdown-item text-danger fw-bold" href="/Admin/Dashboard"><i class="bi bi-speedometer2 me-2"></i> Admin Portal</a></li>
                         <li><hr class="dropdown-divider"></li>`;
    }
    else if (role === 'Manager') {
        dashboardLink = `<li><a class="dropdown-item text-warning fw-bold" href="/Manager/Dashboard"><i class="bi bi-shop me-2"></i> Quản lý Nhà hàng</a></li>
                         <li><hr class="dropdown-divider"></li>`;
    }

    return `
        <div class="dropdown">
            <button class="btn btn-outline-warning dropdown-toggle" type="button" id="userMenuToggle" data-bs-toggle="dropdown" aria-expanded="true" title="Menu người dùng">
                <i class="bi bi-person-circle fs-5"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="userMenuToggle">
                <li><strong class="dropdown-item-text"><i class="bi bi-person me-2"></i> ${fullName}</strong></li>
                <li><small class="dropdown-item-text text-muted ps-3">${email}</small></li>
                <li><hr class="dropdown-divider"></li>
                
                ${dashboardLink} <li><a class="dropdown-item" href="/Account/Index"><i class="bi bi-gear me-2"></i> Hồ sơ cá nhân</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" id="logout-btn"><i class="bi bi-box-arrow-right me-2"></i> Đăng xuất</a></li>
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
        const path = window.location.pathname; // Lấy đường dẫn hiện tại

        const IS_ADMIN_PAGE = path.startsWith('/Admin');
        const IS_MANAGER_PAGE = path.startsWith('/Manager'); // [MỚI] Check trang Manager
        const IS_CHECKOUT_PAGE = path.toLowerCase().includes('/checkout');

        if (userInfo && userInfo.userID) {
            const userRole = userInfo.role || userInfo.Role;

            // [LOGIC BẢO VỆ TRANG ADMIN]
            if (IS_ADMIN_PAGE && userRole !== 'Admin') {
                console.warn("Truy cập trái phép vào trang Admin.");
                window.location.href = '/Home/Index';
                return;
            }

            // [LOGIC BẢO VỆ TRANG MANAGER]
            if (IS_MANAGER_PAGE && userRole !== 'Manager') {
                console.warn("Truy cập trái phép vào trang Manager.");
                window.location.href = '/Home/Index'; // Hoặc trang thông báo lỗi
                return;
            }

            container.innerHTML = createLoggedInMarkup(userInfo);
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

        } else {
            // TRƯỜNG HỢP CHƯA ĐĂNG NHẬP (GUEST)
            container.innerHTML = createLoggedOutMarkup();

            // Nếu cố vào trang Admin hoặc Manager mà chưa login -> Đá về trang Login
            if (IS_ADMIN_PAGE || IS_MANAGER_PAGE) {
                const redirectUrl = encodeURIComponent(path + window.location.search);
                window.location.href = `/Home/Login?ReturnUrl=${redirectUrl}`;
                return;
            }

            // Logic trang thanh toán
            if (IS_CHECKOUT_PAGE) {
                alert("Vui lòng đăng nhập để tiến hành thanh toán.");
                const redirectUrl = encodeURIComponent(path + window.location.search);
                window.location.href = `/Home/Login?ReturnUrl=${redirectUrl}`;
                return;
            }
        }
    } catch (error) {
        console.error("Lỗi kiểm tra phiên:", error);
        // Xử lý lỗi tương tự như chưa đăng nhập
        if (window.location.pathname.toLowerCase().includes('/checkout')) {
            alert("Vui lòng đăng nhập để tiến hành thanh toán.");
            window.location.href = '/Home/Login';
        }
    }

    attachAccountLogoutEvent();
}

function attachAccountLogoutEvent() {
    const accountLogoutBtn = document.getElementById('account-logout-btn');
    if (accountLogoutBtn) {
        accountLogoutBtn.addEventListener('click', handleLogout);
    }
}

checkAuthStatus();