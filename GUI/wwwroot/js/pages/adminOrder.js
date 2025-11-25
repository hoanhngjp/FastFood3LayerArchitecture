import { getAllOrders, updateOrderStatus, deleteOrder } from '../services/orderService.js';

// --- CÁC PHẦN TỬ DOM CẦN THIẾT ---
const ordersTableBody = document.querySelector('.table tbody');
const totalOrdersHeader = document.querySelector('.card-header h5');
const loadingIndicator = document.createElement('tr');
loadingIndicator.innerHTML = '<td colspan="6" class="text-center p-4"><div class="spinner-border text-primary me-2" role="status"></div>Đang tải dữ liệu...</td>';

// --- HÀM TRỢ GIÚP ---

// Hàm này cần được thay thế bằng hàm thực tế lấy token Admin của bạn
function getAdminToken() {
    // Ví dụ: Lấy từ Local Storage
    return localStorage.getItem('adminAccessToken') || 'DUMMY_ADMIN_TOKEN';
}

/**
 * Hàm định dạng tiền tệ (Sử dụng lại hàm đã có)
 */
const formatCurrency = (amount) => {
    const value = parseFloat(amount || 0);
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(value);
};

/**
 * Hàm lấy màu badge dựa trên trạng thái
 */
const getStatusBadge = (statusName) => {
    let colorClass = 'bg-secondary'; // Default
    switch (statusName.toLowerCase()) {
        case 'pending': // Chờ xác nhận
            colorClass = 'bg-warning text-dark';
            break;
        case 'processing': // Đang xử lý / chuẩn bị
            colorClass = 'bg-primary';
            break;
        case 'shipped': // Đang giao
            colorClass = 'bg-info';
            break;
        case 'delivered': // Đã hoàn thành
        case 'completed':
            colorClass = 'bg-success';
            break;
        case 'cancelled': // Đã hủy
            colorClass = 'bg-danger';
            break;
    }
    return `<span class="badge ${colorClass}">${statusName}</span>`;
};


// --- HÀM RENDER DỮ LIỆU ---

/**
 * Hàm chèn dữ liệu orders vào bảng
 * @param {Array<Object>} orders - Danh sách OrderDTO từ API
 */
function renderOrders(orders) {
    if (!ordersTableBody) return;

    // Xóa nội dung cũ (hoặc loading indicator)
    ordersTableBody.innerHTML = '';

    if (orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Không tìm thấy đơn hàng nào.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = ordersTableBody.insertRow();

        // 1. Mã đơn hàng
        row.insertCell().textContent = `#ORD${order.orderID}`;

        // 2. Khách hàng (Tạm thời chỉ hiển thị UserID, bạn cần dùng API User để lấy tên thật)
        row.insertCell().textContent = `User ${order.userID}`;

        // 3. Ngày đặt
        // Format ngày đặt cho dễ đọc
        const orderTime = new Date(order.orderTime).toLocaleDateString('vi-VN');
        row.insertCell().textContent = orderTime;

        // 4. Tổng tiền
        row.insertCell().textContent = formatCurrency(order.totalAmount);

        // 5. Trạng thái
        row.insertCell().innerHTML = getStatusBadge(order.statusName || 'Pending');

        // 6. Hành động (Xem chi tiết & Xóa)
        const actionCell = row.insertCell();
        actionCell.innerHTML = `
            <a href="/admin/orders/${order.orderID}" class="btn btn-sm btn-outline-secondary me-2">Xem</a>
            <button class="btn btn-sm btn-danger delete-order-btn" data-order-id="${order.orderID}">Xóa</button>
        `;
    });

    // Cập nhật tổng số đơn hàng
    if (totalOrdersHeader) {
        totalOrdersHeader.textContent = `Danh sách Đơn hàng (${orders.length} đơn)`;
    }

    // Thêm Listener cho nút Xóa
    attachDeleteListeners();
}


// --- HÀM CHÍNH TẢI DỮ LIỆU ---

/**
 * Hàm tải dữ liệu orders từ API
 */
async function loadOrders() {
    const adminToken = getAdminToken();
    if (!adminToken) {
        alert("Lỗi: Không tìm thấy token Admin. Vui lòng đăng nhập lại.");
        return;
    }

    ordersTableBody.appendChild(loadingIndicator);

    try {
        const orders = await getAllOrders(adminToken);
        renderOrders(orders);
    } catch (error) {
        console.error("Lỗi khi tải Orders:", error);
        ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Không thể tải dữ liệu. Lỗi: ${error.message}. (Kiểm tra xem token Admin đã hợp lệ chưa?)</td></tr>`;
        if (totalOrdersHeader) totalOrdersHeader.textContent = `Danh sách Đơn hàng (Lỗi)`;
    }
}


// --- XỬ LÝ SỰ KIỆN XÓA ---

function attachDeleteListeners() {
    document.querySelectorAll('.delete-order-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const orderId = e.target.dataset.orderId;
            if (confirm(`Bạn có chắc chắn muốn xóa đơn hàng #${orderId} này không?`)) {
                try {
                    e.target.disabled = true;
                    e.target.textContent = 'Đang xóa...';
                    await deleteOrder(parseInt(orderId), getAdminToken());
                    alert(`Đơn hàng #${orderId} đã được xóa thành công.`);

                    // Tải lại danh sách sau khi xóa thành công
                    loadOrders();
                } catch (error) {
                    alert(`Lỗi khi xóa đơn hàng #${orderId}: ${error.message}`);
                    e.target.disabled = false;
                    e.target.textContent = 'Xóa';
                }
            }
        });
    });
}


// Khởi chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', loadOrders);