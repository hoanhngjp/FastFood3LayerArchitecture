import { getAllOrdersSystem } from '../services/adminService.js';

const tableBody = document.getElementById('orders-table-body');
const totalCountEl = document.getElementById('total-orders-count');

async function loadOrders() {
    try {
        const orders = await getAllOrdersSystem();
        renderTable(orders);
    } catch (e) {
        console.error(e);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>`;
    }
}

function renderTable(orders) {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (totalCountEl) totalCountEl.textContent = orders.length;

    orders.forEach(o => {
        const date = new Date(o.orderTime).toLocaleString('vi-VN');
        const total = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(o.totalAmount);

        let badgeClass = 'bg-secondary';
        if (o.statusName === 'Pending') badgeClass = 'bg-warning text-dark';
        if (o.statusName === 'Confirmed') badgeClass = 'bg-info text-dark';
        if (o.statusName === 'Shipping' || o.statusName === 'Delivering') badgeClass = 'bg-primary';
        if (o.statusName === 'Success') badgeClass = 'bg-success';
        if (o.statusName === 'Cancelled') badgeClass = 'bg-danger';

        const row = `
            <tr>
                <td><span class="fw-bold text-primary">#${o.orderID}</span></td>
                <td>${o.restaurantName || 'N/A'}</td>
                <td>User #${o.userID}</td>
                <td>${date}</td>
                <td class="fw-bold">${total}</td>
                <td><span class="badge ${badgeClass}">${o.statusName}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="alert('Xem chi tiết đơn #${o.orderID}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Auto refresh mỗi 30s để giám sát
setInterval(loadOrders, 30000);

document.addEventListener('DOMContentLoaded', loadOrders);