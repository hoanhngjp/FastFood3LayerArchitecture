import {
    getRestaurantOrders, confirmOrder, cancelOrder,
    getAvailableDrones, assignDroneToOrder,
    getMyRestaurants
} from '../services/managerService.js';

// --- DOM ELEMENTS ---
const dom = {
    // Main View
    tableBody: document.getElementById('manager-orders-table'),
    refreshBtn: document.getElementById('btn-refresh'),
    statusFilter: document.getElementById('select-status-filter'),
    resSelector: document.getElementById('restaurant-selector'), // Dropdown chọn quán

    // Modal: Gán Drone
    droneModalEl: document.getElementById('assignDroneModal'),
    droneSelect: document.getElementById('drone-select'),
    btnConfirmAssign: document.getElementById('btn-confirm-assign'),

    // Modal: Chi tiết đơn hàng
    detailModalEl: document.getElementById('orderDetailModal'),
    detailTitle: document.getElementById('detail-modal-title'),
    detailCustomer: document.getElementById('detail-customer'),
    detailTime: document.getElementById('detail-time'),
    detailStatus: document.getElementById('detail-status'),
    detailTotal: document.getElementById('detail-total'),
    detailItemsBody: document.getElementById('detail-items-body')
};

// --- STATE ---
let droneModal; // Bootstrap Modal Instance
let detailModal; // Bootstrap Modal Instance
let currentOrderId = 0; // ID đơn hàng đang thao tác
let currentResId = localStorage.getItem('currentRestaurantId'); // ID quán đang chọn
let currentOrdersList = []; // Lưu cache danh sách đơn hàng để hiển thị chi tiết mà không gọi lại API

// --- UTILS ---
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

// --- MAIN LOGIC ---

async function initPage() {
    try {
        // 1. Load danh sách nhà hàng của Manager
        const restaurants = await getMyRestaurants();

        if (!restaurants || restaurants.length === 0) {
            if (dom.tableBody) dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Bạn chưa được phân quyền quản lý nhà hàng nào.</td></tr>`;
            return;
        }

        // 2. Render Select Box
        if (dom.resSelector) {
            dom.resSelector.innerHTML = '';
            restaurants.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.restaurantID;
                opt.textContent = r.name;
                dom.resSelector.appendChild(opt);
            });

            // 3. Auto Select (Logic đồng bộ với Dashboard)
            // Nếu localStorage có ID hợp lệ (và nằm trong list) thì dùng, ko thì dùng quán đầu tiên
            if (currentResId && restaurants.find(r => r.restaurantID == currentResId)) {
                dom.resSelector.value = currentResId;
            } else {
                currentResId = restaurants[0].restaurantID;
                dom.resSelector.value = currentResId;
                localStorage.setItem('currentRestaurantId', currentResId);
            }

            // 4. Gắn sự kiện đổi quán
            dom.resSelector.addEventListener('change', () => {
                currentResId = dom.resSelector.value;
                localStorage.setItem('currentRestaurantId', currentResId); // Lưu lại để Dashboard cũng biết
                loadOrders(); // Tải lại đơn hàng của quán mới
            });
        }

        // 5. Load đơn hàng lần đầu
        loadOrders();

    } catch (e) {
        console.error("Init Error:", e);
        if (dom.tableBody) dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi khởi tạo: ${e.message}</td></tr>`;
    }
}

async function loadOrders() {
    try {
        if (!currentResId) return;

        // UI Loading effect
        if (dom.refreshBtn) dom.refreshBtn.firstElementChild.classList.add('fa-spin');
        if (dom.tableBody) dom.tableBody.style.opacity = '0.5';

        const status = dom.statusFilter ? dom.statusFilter.value : 'All';

        // Gọi API lấy đơn hàng theo Quán + Status
        const orders = await getRestaurantOrders(currentResId, status);

        // Lưu vào biến state local
        currentOrdersList = orders || [];

        renderTable(currentOrdersList);

    } catch (e) {
        console.error(e);
        if (dom.tableBody) dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu: ${e.message}</td></tr>`;
    } finally {
        // Remove Loading effect
        if (dom.refreshBtn) dom.refreshBtn.firstElementChild.classList.remove('fa-spin');
        if (dom.tableBody) dom.tableBody.style.opacity = '1';
    }
}

function renderTable(orders) {
    if (!dom.tableBody) return;
    dom.tableBody.innerHTML = '';

    if (!orders || orders.length === 0) {
        dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5">Chưa có đơn hàng nào.</td></tr>`;
        return;
    }

    orders.forEach(o => {
        // Map DTO Properties (Support cả camelCase và PascalCase cho an toàn)
        const id = o.orderID || o.OrderID;
        const userId = o.userID || o.UserID;
        const time = formatDate(o.orderTime || o.OrderTime);
        const total = formatCurrency(o.totalAmount || o.TotalAmount);
        const status = o.statusName || o.StatusName || 'Unknown';

        // Tạo Badge màu sắc theo trạng thái
        let badgeClass = 'bg-secondary';
        if (status === 'Pending') badgeClass = 'bg-warning text-dark';
        else if (status === 'Preparing') badgeClass = 'bg-info text-dark';
        else if (status === 'Confirmed') badgeClass = 'bg-primary';
        else if (status === 'Delivering' || status === 'Shipping') badgeClass = 'bg-primary';
        else if (status === 'Success' || status === 'Completed' || status === 'Delivered') badgeClass = 'bg-success';
        else if (status === 'Cancelled') badgeClass = 'bg-danger';

        // Tạo Action Buttons
        let actions = `
            <button class="btn btn-sm btn-outline-secondary me-1" onclick="window.handleViewDetail(${id})" title="Xem chi tiết">
                <i class="bi bi-eye"></i>
            </button>
        `;

        // Logic hiển thị nút bấm dựa trên trạng thái
        if (status === 'Pending') {
            actions += `
                <button class="btn btn-sm btn-success me-1" onclick="window.handleConfirm(${id})" title="Xác nhận">
                    <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.handleCancel(${id})" title="Từ chối">
                    <i class="bi bi-x-lg"></i>
                </button>`;
        }
        else if (status === 'Confirmed' || status === 'Preparing') {
            // Nếu đã xác nhận -> Cho phép gán Drone
            actions += `
                <button class="btn btn-sm btn-warning fw-bold" onclick="window.openDroneModal(${id})">
                    <i class="bi bi-airplane-fill me-1"></i> Giao Drone
                </button>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="ps-3 fw-bold text-primary">#${id}</td>
            <td>User #${userId}</td>
            <td>${time}</td>
            <td class="fw-bold">${total}</td>
            <td><span class="badge ${badgeClass}">${status}</span></td>
            <td class="text-end pe-3">${actions}</td>
        `;
        dom.tableBody.appendChild(row);
    });
}

// --- GLOBAL HANDLERS (Gắn vào window để HTML gọi được) ---

// 1. XEM CHI TIẾT
window.handleViewDetail = (id) => {
    // Tìm đơn hàng trong list đã tải (không cần gọi lại API)
    const order = currentOrdersList.find(o => (o.orderID || o.OrderID) == id);
    if (!order) return;

    // Init Modal nếu chưa có
    if (!detailModal && window.bootstrap) {
        detailModal = new window.bootstrap.Modal(dom.detailModalEl);
    }

    // Map Data
    const status = order.statusName || order.StatusName;
    const items = order.items || order.Items || [];

    // Fill thông tin chung
    dom.detailTitle.textContent = `Chi tiết đơn hàng #${id}`;
    dom.detailCustomer.textContent = `User ID: ${order.userID || order.UserID}`;
    dom.detailTime.textContent = formatDate(order.orderTime || order.OrderTime);
    dom.detailStatus.innerHTML = `<span class="badge bg-secondary">${status}</span>`;
    dom.detailTotal.textContent = formatCurrency(order.totalAmount || order.TotalAmount);

    // Render bảng Items
    dom.detailItemsBody.innerHTML = '';
    if (items.length > 0) {
        items.forEach(item => {
            // Map Item DTO
            const name = item.foodName || item.FoodName;
            const qty = item.quantity || item.Quantity;
            const price = item.price || item.Price;
            const img = item.foodImageUrl || item.FoodImageUrl || 'https://placehold.co/50x50?text=Food';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${img}" alt="${name}" class="rounded me-2" style="width: 40px; height: 40px; object-fit: cover;">
                        <span>${name}</span>
                    </div>
                </td>
                <td class="text-center">${qty}</td>
                <td class="text-end">${formatCurrency(price)}</td>
                <td class="text-end fw-bold">${formatCurrency(price * qty)}</td>
            `;
            dom.detailItemsBody.appendChild(tr);
        });
    } else {
        dom.detailItemsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Không có thông tin món ăn</td></tr>';
    }

    detailModal.show();
};

// 2. XÁC NHẬN ĐƠN
window.handleConfirm = async (id) => {
    if (!confirm(`Bạn có chắc muốn xác nhận đơn hàng #${id}?`)) return;
    try {
        await confirmOrder(id);
        loadOrders();
    } catch (e) { alert("Lỗi: " + e.message); }
};

// 3. HỦY ĐƠN
window.handleCancel = async (id) => {
    if (!confirm(`Bạn có chắc muốn HỦY đơn hàng #${id}?`)) return;
    try {
        await cancelOrder(id);
        loadOrders();
    } catch (e) { alert("Lỗi: " + e.message); }
};

// 4. MỞ MODAL DRONE
window.openDroneModal = async (id) => {
    currentOrderId = id;
    if (!droneModal && window.bootstrap) {
        droneModal = new window.bootstrap.Modal(dom.droneModalEl);
    }

    droneModal.show();
    dom.droneSelect.innerHTML = '<option>Đang tải danh sách...</option>';
    dom.btnConfirmAssign.disabled = true;

    try {
        const drones = await getAvailableDrones();
        dom.droneSelect.innerHTML = '';

        if (!drones || drones.length === 0) {
            dom.droneSelect.innerHTML = '<option disabled selected>Không có Drone nào rảnh!</option>';
            return;
        }

        dom.droneSelect.innerHTML = '<option value="" selected disabled>-- Chọn Drone --</option>';
        drones.forEach(d => {
            const dId = d.droneID || d.DroneID;
            const model = d.model || d.Model;
            const bat = d.currentBattery || d.CurrentBattery || 0;

            dom.droneSelect.innerHTML += `<option value="${dId}">${model} (Pin: ${bat}%)</option>`;
        });
        dom.btnConfirmAssign.disabled = false;
    } catch (e) {
        dom.droneSelect.innerHTML = '<option disabled>Lỗi tải Drone</option>';
    }
};

// 5. NÚT XÁC NHẬN GÁN DRONE
if (dom.btnConfirmAssign) {
    dom.btnConfirmAssign.addEventListener('click', async () => {
        const droneId = dom.droneSelect.value;
        if (!droneId) { alert("Vui lòng chọn Drone!"); return; }

        dom.btnConfirmAssign.textContent = "Đang xử lý...";
        dom.btnConfirmAssign.disabled = true;

        try {
            await assignDroneToOrder(currentOrderId, droneId);
            alert("Đã gán Drone thành công!");
            if (droneModal) droneModal.hide();
            loadOrders(); // Reload lại bảng
        } catch (e) {
            alert("Lỗi: " + e.message);
        } finally {
            dom.btnConfirmAssign.textContent = "Giao hàng ngay";
            dom.btnConfirmAssign.disabled = false;
        }
    });
}

// Init: Chạy khi trang load
document.addEventListener('DOMContentLoaded', () => {
    if (dom.statusFilter) dom.statusFilter.addEventListener('change', loadOrders);
    if (dom.refreshBtn) dom.refreshBtn.addEventListener('click', loadOrders);

    // Gọi hàm khởi tạo
    initPage();
});