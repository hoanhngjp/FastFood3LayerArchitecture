import { getAllOrders } from '../services/orderService.js';
// Giả định foodService.js có hàm getActiveFoodsCount
import { getActiveFoodsCount } from '../services/foodService.js';

// --- CÁC PHẦN TỬ DOM CẦN THIẾT ---
const ordersTodayCountEl = document.getElementById('orders-today-count');
const revenueTodayAmountEl = document.getElementById('revenue-today-amount');
const activeFoodsCountEl = document.getElementById('active-foods-count');
const recentOrdersBodyEl = document.getElementById('recent-orders-body');
const loadingAreaEl = document.getElementById('dashboard-loading-area');
const errorAreaEl = document.getElementById('dashboard-error-area');

// --- HÀM TRỢ GIÚP ---
function getAdminToken() {
    return localStorage.getItem('adminAccessToken');
}

const formatCurrency = (amount) => {
    const value = parseFloat(amount || 0);
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(value);
};

const getStatusBadge = (statusName) => {
    // Logic badge màu (Đã có trong adminOrder.js, cần copy sang đây nếu không import)
    let colorClass = 'bg-secondary';
    switch (statusName.toLowerCase()) {
        case 'pending': colorClass = 'bg-warning text-dark'; break;
        case 'processing': colorClass = 'bg-primary'; break;
        case 'delivered': case 'completed': colorClass = 'bg-success'; break;
        case 'cancelled': colorClass = 'bg-danger'; break;
    }
    return `<span class="badge ${colorClass}">${statusName}</span>`;
};

// --- HÀM TẢI VÀ HIỂN THỊ DỮ LIỆU ---

async function loadDashboardData() {
    const adminToken = getAdminToken();

    if (loadingAreaEl) loadingAreaEl.style.display = 'block';
    if (errorAreaEl) errorAreaEl.style.display = 'none';

    if (!adminToken) {
        if (loadingAreaEl) loadingAreaEl.style.display = 'none';
        if (errorAreaEl) {
            errorAreaEl.textContent = "Lỗi: Vui lòng đăng nhập với tài khoản Admin.";
            errorAreaEl.style.display = 'block';
        }
        return;
    }

    try {
        // 1. Lấy tất cả Order (hoặc dùng API thống kê nếu có)
        const allOrders = await getAllOrders(adminToken);
        const today = new Date().toISOString().split('T')[0];

        // Lọc đơn hàng hôm nay
        const ordersToday = allOrders.filter(order => order.orderTime.startsWith(today));
        const revenueToday = ordersToday.reduce((sum, order) => sum + order.totalAmount, 0);

        // Cập nhật thẻ thống kê Order/Revenue
        if (ordersTodayCountEl) ordersTodayCountEl.textContent = ordersToday.length;
        if (revenueTodayAmountEl) revenueTodayAmountEl.textContent = formatCurrency(revenueToday).replace('₫', 'M').replace(',000', ''); // Định dạng đơn giản

        // 2. Lấy số lượng món ăn
        // GIẢ ĐỊNH: getActiveFoodsCount() trả về 1 số
        const foodsCount = await getActiveFoodsCount(adminToken);
        if (activeFoodsCountEl) activeFoodsCountEl.textContent = foodsCount;

        // 3. Hiển thị 5 đơn hàng gần nhất
        const recentOrders = allOrders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime)).slice(0, 5);

        if (recentOrdersBodyEl) {
            recentOrdersBodyEl.innerHTML = '';
            recentOrders.forEach(order => {
                const row = recentOrdersBodyEl.insertRow();
                row.insertCell().textContent = `#ORD${order.orderID}`;
                // Cần API User để lấy tên khách hàng
                row.insertCell().textContent = `User ${order.userID}`;
                row.insertCell().textContent = new Date(order.orderTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                row.insertCell().innerHTML = `<span class="fw-bold">${formatCurrency(order.totalAmount)}</span>`;
                row.insertCell().innerHTML = getStatusBadge(order.statusName || 'Pending');
            });
        }

        if (loadingAreaEl) loadingAreaEl.style.display = 'none';

    } catch (error) {
        console.error("Lỗi khi tải Dashboard:", error);
        if (loadingAreaEl) loadingAreaEl.style.display = 'none';
        if (errorAreaEl) {
            errorAreaEl.textContent = `Không thể tải dữ liệu Dashboard. Lỗi: ${error.message}.`;
            errorAreaEl.style.display = 'block';
        }
    }
}

document.addEventListener('DOMContentLoaded', loadDashboardData);