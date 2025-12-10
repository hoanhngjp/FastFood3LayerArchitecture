// File: /js/pages/account.js
import { getMyOrders } from '../services/userService.js';

// --- UTILS (Định dạng) ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const getStatusBadge = (status) => {
    let color = 'secondary';
    let text = status;
    switch (status) {
        case 'Pending': color = 'warning text-dark'; text = 'Chờ xử lý'; break;
        case 'Confirmed': color = 'info text-dark'; text = 'Đã xác nhận'; break;
        case 'Shipping':
        case 'Delivering': color = 'primary'; text = 'Đang giao'; break;
        case 'Completed':
        case 'Success': color = 'success'; text = 'Hoàn thành'; break;
        case 'Cancelled': color = 'danger'; text = 'Đã hủy'; break;
    }
    return `<span class="badge bg-${color}">${text}</span>`;
};

// --- DOM ELEMENTS ---
const dashboardStats = {
    totalOrders: document.querySelector('#dashboard-pane .card-light-orange p.card-text'),
    totalSpent: document.querySelector('#dashboard-pane .card-dark-orange p.card-text'),
    points: document.querySelectorAll('#dashboard-pane .card-light-orange p.card-text')[1]
};
const recentOrdersList = document.querySelector('#dashboard-pane ul.list-group');
const ordersTableBody = document.querySelector('#orders-table-body'); // Lưu ý ID này phải khớp HTML

// Cache để dùng cho Modal
let myOrdersCache = [];

// --- MAIN FUNCTION ---
async function initAccountPage() {
    // 1. Hiển thị loading
    if (ordersTableBody) {
        ordersTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-warning"></div></td></tr>';
    }

    try {
        // 2. Gọi API
        const orders = await getMyOrders();
        myOrdersCache = orders; // Lưu cache

        // 3. Render
        renderDashboard(orders);
        renderOrderHistory(orders);

    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        if (ordersTableBody) {
            ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Không thể tải dữ liệu: ${error.message}</td></tr>`;
        }
    }
}

// --- RENDER FUNCTIONS ---

function renderDashboard(orders) {
    if (!orders) return;

    // Tính toán
    const totalCount = orders.length;
    const validOrders = orders.filter(o => o.statusName !== 'Cancelled');
    const totalAmount = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const points = Math.floor(totalAmount / 10000);

    // Update UI số liệu
    if (dashboardStats.totalOrders) dashboardStats.totalOrders.textContent = totalCount;
    if (dashboardStats.totalSpent) dashboardStats.totalSpent.textContent = formatCurrency(totalAmount);
    if (dashboardStats.points) dashboardStats.points.textContent = points;

    // Update UI Đơn gần đây (Top 5)
    if (recentOrdersList) {
        recentOrdersList.innerHTML = '';
        const recent = orders.slice(0, 5);

        if (recent.length === 0) {
            recentOrdersList.innerHTML = '<li class="list-group-item text-muted text-center">Bạn chưa có đơn hàng nào.</li>';
        } else {
            recent.forEach(o => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <div>
                        <span class="fw-bold text-primary">#${o.orderID}</span>
                        <span class="text-muted small ms-2">${formatDate(o.orderTime)}</span>
                    </div>
                    <div>
                        ${getStatusBadge(o.statusName)}
                        <span class="fw-bold ms-3">${formatCurrency(o.totalAmount)}</span>
                    </div>
                `;
                recentOrdersList.appendChild(li);
            });
        }
    }
}

function renderOrderHistory(orders) {
    if (!ordersTableBody) return;
    ordersTableBody.innerHTML = '';

    if (!orders || orders.length === 0) {
        ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Bạn chưa có đơn hàng nào. <br><a href="/#food-menu" class="btn btn-sm btn-warning mt-2">Đặt món ngay</a></td></tr>`;
        return;
    }

    orders.forEach(o => {
        // Fallback tên nhà hàng
        const restaurantName = o.restaurantName || `Nhà hàng #${o.restaurantID}`;

        // --- [LOGIC MỚI]: Xử lý nút bấm dựa trên trạng thái ---
        let actionButtons = `
            <button class="btn btn-sm btn-outline-primary" onclick="window.showOrderDetail(${o.orderID})" title="Xem chi tiết">
                <i class="bi bi-eye"></i>
            </button>
        `;

        // Danh sách trạng thái cho phép theo dõi (Bạn có thể tùy chỉnh theo DB của bạn)
        // Ví dụ: Confirmed (Đã xác nhận), Shipping (Đang giao), Delivering...
        const trackingStatuses = ['Confirmed', 'Shipping', 'Delivering', 'Prepared'];

        if (trackingStatuses.includes(o.statusName)) {
            // Thêm nút Theo dõi (Link sang trang Tracking)
            actionButtons += `
                <a href="/Order/Tracking/${o.orderID}" class="btn btn-sm btn-warning text-dark fw-bold ms-1" title="Theo dõi đơn hàng">
                    <i class="bi bi-map-fill"></i> Theo dõi
                </a>
            `;
        }
        // -----------------------------------------------------

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="fw-bold text-primary">#${o.orderID}</span></td>
            <td>${formatDate(o.orderTime)}</td>
            <td>${restaurantName}</td>
            <td class="fw-bold text-dark-orange">${formatCurrency(o.totalAmount)}</td>
            <td>${getStatusBadge(o.statusName)}</td>
            <td>
                ${actionButtons} </td>
        `;
        ordersTableBody.appendChild(tr);
    });
}
// --- MODAL LOGIC ---
// Gắn vào window để gọi được từ HTML onclick
window.showOrderDetail = (orderId) => {
    const order = myOrdersCache.find(o => o.orderID === orderId);
    if (!order) return;

    // 1. Điền thông tin chung
    document.getElementById('orderDetailTitle').innerText = `Chi tiết đơn hàng #${order.orderID}`;
    const dateEl = document.getElementById('modal-order-date');
    if (dateEl) dateEl.innerText = formatDate(order.orderTime);

    const statusEl = document.getElementById('modal-order-status');
    if (statusEl) statusEl.innerHTML = getStatusBadge(order.statusName);

    const totalEl = document.getElementById('modal-order-total');
    if (totalEl) totalEl.innerText = formatCurrency(order.totalAmount);

    // 2. Điền danh sách món ăn
    const itemsBody = document.getElementById('modal-items-body');
    if (itemsBody) {
        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemName = item.foodName || `Món #${item.foodID}`;
                // Ảnh: dùng fallback nếu không có
                const imgUrl = item.foodImageUrl || 'https://placehold.co/40?text=Food';

                itemsHtml += `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${imgUrl}" class="rounded me-2" width="40" height="40" style="object-fit:cover">
                                <span>${itemName}</span>
                            </div>
                        </td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">${formatCurrency(item.price)}</td>
                        <td class="text-end">${formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                `;
            });
        } else {
            itemsHtml = '<tr><td colspan="4" class="text-center">Không có thông tin món ăn</td></tr>';
        }
        itemsBody.innerHTML = itemsHtml;
    }

    // 3. Hiển thị Modal
    const modalEl = document.getElementById('orderDetailModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
};

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Nếu tab orders đang active thì load luôn
    if (document.querySelector('#orders-tab.active')) {
        initAccountPage();
    }

    // Hoặc lắng nghe sự kiện chuyển tab
    const orderTabBtn = document.getElementById('orders-tab');
    if (orderTabBtn) {
        orderTabBtn.addEventListener('shown.bs.tab', () => {
            // Chỉ load nếu chưa có dữ liệu (hoặc muốn reload thì bỏ check này)
            if (myOrdersCache.length === 0) {
                initAccountPage();
            }
        });
    }

    // Mặc định load Dashboard luôn
    initAccountPage();
});