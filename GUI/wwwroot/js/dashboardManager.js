/**
 * js/dashboardManager.js
 * Quản lý Tab Tổng quan (Dashboard) và Lịch sử Đơn hàng (Orders).
 * ĐÃ SỬA LỖI IMPORT. ĐÃ VÔ HIỆU HÓA STATS.
 */
import { orderService } from './services/orderService.js';
import { loadAddresses } from './addressManager.js';

// --- Dashboard Logic ---
const totalOrdersCard = document.getElementById('totalOrdersCard')?.querySelector('.card-text:nth-child(2)');
const totalSpendingCard = document.getElementById('totalSpendingCard')?.querySelector('.card-text:nth-child(2)');
const loyaltyPointsCard = document.getElementById('loyaltyPointsCard')?.querySelector('.card-text:nth-child(2)');
const recentOrdersList = document.getElementById('recentOrdersList');

/**
 * Tải dữ liệu tổng quan (Dashboard)
 */
async function loadDashboardData() {
    // API /me/stats BỊ VÔ HIỆU HÓA
    if (totalOrdersCard) totalOrdersCard.textContent = '0 (Thiếu API Stats)';
    if (totalSpendingCard) totalSpendingCard.textContent = '0₫ (Thiếu API Stats)';
    if (loyaltyPointsCard) loyaltyPointsCard.textContent = '0 (Thiếu API Stats)';

    // Lấy 5 đơn hàng gần đây cho Dashboard (sử dụng GET /orders)
    await loadRecentOrders();
}

/**
 * Tải 5 đơn hàng gần đây cho Dashboard (sử dụng GET /orders)
 */
async function loadRecentOrders() {
    if (!recentOrdersList) return;

    recentOrdersList.innerHTML = '<li class="list-group-item"><span class="spinner-border spinner-border-sm me-2" role="status"></span> Đang tải đơn hàng...</li>';
    try {
        const orders = await orderService.getMyOrders(5);

        if (!orders || orders.length === 0) {
            recentOrdersList.innerHTML = '<li class="list-group-item text-muted">Không có đơn hàng nào trong hệ thống.</li>';
            return;
        }

        orders.sort((a, b) => (b.orderID || b.OrderID) - (a.orderID || a.OrderID));

        recentOrdersList.innerHTML = orders.slice(0, 5).map(order => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div class="fw-bold">
                    Đơn hàng #${order.orderID || order.OrderID} - ${new Date(order.orderDate || order.OrderDate).toLocaleDateString()}
                </div>
                <div>
                    <span class="text-dark-orange fw-bold me-3">${(order.totalAmount || order.TotalAmount)?.toLocaleString('vi-VN')}₫</span>
                    <span class="badge rounded-pill bg-info text-dark">${order.status || 'Chưa rõ'}</span>
                </div>
            </li>
        `).join('');

    } catch (error) {
        recentOrdersList.innerHTML = `<li class="list-group-item text-danger">Lỗi tải đơn hàng: ${error.message}</li>`;
    }
}

// --- Order History Logic ---

const ordersTableBody = document.getElementById('orders-pane')?.querySelector('tbody');

async function loadOrderHistory() {
    if (!ordersTableBody) return;

    ordersTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4"><span class="spinner-border text-warning" role="status"></span> Đang tải lịch sử đơn hàng...</td></tr>';
    try {
        const orders = await orderService.getMyOrders(0);

        if (!orders || orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Không có đơn hàng nào trong hệ thống.</td></tr>';
            return;
        }

        orders.sort((a, b) => (b.orderID || b.OrderID) - (a.orderID || a.OrderID));

        ordersTableBody.innerHTML = orders.map(order => `
            <tr>
                <td>#${order.orderID || order.OrderID}</td>
                <td>${new Date(order.orderDate || order.OrderDate).toLocaleDateString()}</td>
                <td class="fw-bold">${(order.totalAmount || order.TotalAmount)?.toLocaleString('vi-VN')}₫</td>
                <td><span class="badge bg-secondary">${order.status || 'Chưa rõ'}</span></td>
                <td><button class="btn btn-sm btn-outline-info view-order-btn" data-id="${order.orderID || order.OrderID}"><i class="bi bi-eye"></i></button></td>
            </tr>
        `).join('');

        ordersTableBody.querySelectorAll('.view-order-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const orderId = btn.dataset.id;
                try {
                    const detail = await orderService.getOrderById(orderId);
                    alert(`Chi tiết Đơn hàng #${orderId}: \n${JSON.stringify(detail, null, 2)}`);
                } catch (error) {
                    alert(`Không thể tải chi tiết đơn hàng #${orderId}: ${error.message}`);
                }
            });
        });


    } catch (error) {
        ordersTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-danger">Lỗi khi tải lịch sử: ${error.message}</td></tr>`;
    }
}

// --- Khởi tạo và Quản lý Tabs ---

const dashboardTab = document.getElementById('dashboard-tab');
const ordersTab = document.getElementById('orders-tab');
const addressTab = document.getElementById('address-tab');

if (dashboardTab) {
    dashboardTab.addEventListener('show.bs.tab', loadDashboardData);
    if (dashboardTab.classList.contains('active')) {
        loadDashboardData();
    }
}

if (ordersTab) {
    ordersTab.addEventListener('show.bs.tab', loadOrderHistory);
}

if (addressTab) {
    addressTab.addEventListener('show.bs.tab', loadAddresses);
    if (addressTab.classList.contains('active')) {
        loadAddresses();
    }
}