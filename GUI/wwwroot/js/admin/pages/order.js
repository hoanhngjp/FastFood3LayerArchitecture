import { orderService } from '../services/adminOrderService.js';
import { restaurantService } from '../services/adminRestaurantService.js'; // MỚI: Import service nhà hàng

const dom = {
    tableBody: document.getElementById('orderTableBody'),
    searchInput: document.getElementById('searchKeyword'),
    filterStatus: document.getElementById('filterStatus'),
    filterRestaurant: document.getElementById('filterRestaurant'), // MỚI: Dom cho dropdown nhà hàng
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    pagingInfo: document.getElementById('pagingInfo'),
    paginationControls: document.getElementById('paginationControls'),

    // Modal Details (Giữ nguyên)
    modalDetail: new bootstrap.Modal(document.getElementById('orderDetailModal')),
    detailOrderId: document.getElementById('detailOrderId'),
    detailDate: document.getElementById('detailDate'),
    detailRestaurant: document.getElementById('detailRestaurant'),
    detailTotal: document.getElementById('detailTotal'),
    detailItemsBody: document.getElementById('detailItemsBody'),
    detailStatusSelect: document.getElementById('detailStatusSelect')
};

let state = {
    rawOrders: [],
    processedOrders: [],
    currentPage: 1,
    pageSize: 10,
    currentDetailId: null
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadRestaurants(); // MỚI: Load danh sách nhà hàng trước
    loadOrders();
    setupEvents();
});

function setupEvents() {
    dom.searchInput.addEventListener('input', () => { state.currentPage = 1; processData(); });
    dom.filterStatus.addEventListener('change', () => { state.currentPage = 1; processData(); });
    dom.filterRestaurant.addEventListener('change', () => { state.currentPage = 1; processData(); }); // MỚI: Sự kiện lọc nhà hàng
    dom.pageSizeSelect.addEventListener('change', (e) => {
        state.pageSize = parseInt(e.target.value);
        state.currentPage = 1;
        processData();
    });
}

// --- LOAD OPTIONS ---
async function loadRestaurants() {
    try {
        const list = await restaurantService.getAll();
        if (list && list.length > 0) {
            let html = '<option value="">-- Tất cả nhà hàng --</option>';
            list.forEach(r => {
                html += `<option value="${r.restaurantID}">${r.name}</option>`;
            });
            dom.filterRestaurant.innerHTML = html;
        } else {
            dom.filterRestaurant.innerHTML = '<option value="">Không có dữ liệu</option>';
        }
    } catch (e) {
        console.error("Lỗi load nhà hàng:", e);
        dom.filterRestaurant.innerHTML = '<option value="">Lỗi tải</option>';
    }
}

// --- LOAD ORDERS ---
window.loadOrders = async () => {
    try {
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải dữ liệu...</td></tr>';
        const data = await orderService.getAll();
        state.rawOrders = data || [];
        processData();
    } catch (e) {
        console.error(e);
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Lỗi kết nối</td></tr>';
    }
};

function processData() {
    const keyword = dom.searchInput.value.toLowerCase().trim();
    const statusFilter = dom.filterStatus.value;
    const resFilter = dom.filterRestaurant.value; // MỚI: Lấy giá trị lọc nhà hàng

    state.processedOrders = state.rawOrders.filter(o => {
        // 1. Lọc theo từ khóa (ID hoặc Tên khách - nếu có trong DTO, hoặc Tên nhà hàng)
        const matchKey = o.orderID.toString().includes(keyword) ||
            (o.restaurantName || '').toLowerCase().includes(keyword);

        // 2. Lọc theo StatusName
        const matchStatus = statusFilter ? (o.statusName === statusFilter) : true;

        // 3. MỚI: Lọc theo RestaurantID
        const matchRes = resFilter ? (o.restaurantID == resFilter) : true;

        return matchKey && matchStatus && matchRes;
    });

    // Sắp xếp mới nhất lên đầu
    state.processedOrders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));

    renderTable();
}

function renderTable() {
    const total = state.processedOrders.length;
    const pages = Math.ceil(total / state.pageSize);
    if (state.currentPage > pages && pages > 0) state.currentPage = 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, total);
    const data = state.processedOrders.slice(start, end);

    dom.tableBody.innerHTML = '';
    if (total === 0) {
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Không có dữ liệu</td></tr>';
        renderPagination(0, 0, 0, 0);
        return;
    }

    data.forEach(item => {
        // Badge color
        let badgeClass = "bg-secondary";
        const st = item.statusName || "";

        // 1: Pending
        if (st === "Pending") badgeClass = "bg-warning text-dark";
        // 2: Confirmed
        else if (st === "Confirmed") badgeClass = "bg-info text-dark";
        // 3: Preparing
        else if (st === "Preparing") badgeClass = "bg-primary bg-opacity-75";
        // 4: Delivering
        else if (st === "Delivering") badgeClass = "bg-primary";
        // 6: Delivered
        else if (st === "Delivered") badgeClass = "bg-success bg-opacity-75";
        // 5: Completed
        else if (st === "Completed") badgeClass = "bg-success";
        // 99: Cancelled
        else if (st === "Cancelled") badgeClass = "bg-danger";

        const dateStr = new Date(item.orderTime).toLocaleString('vi-VN');
        const priceStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalAmount);

        const row = `
            <tr>
                <td class="ps-4 fw-bold">#${item.orderID}</td>
                <td>${dateStr}</td>
                <td>${item.restaurantName || 'Unknown'}</td>
                <td class="fw-bold text-primary">${priceStr}</td>
                <td><span class="badge ${badgeClass}">${st}</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-info me-2" onclick="window.viewDetail(${item.orderID})">
                        <i class="bi bi-eye"></i> Chi tiết
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteOrder(${item.orderID})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        dom.tableBody.insertAdjacentHTML('beforeend', row);
    });
    renderPagination(total, pages, start, end);
}

// ... (Các hàm renderPagination, viewDetail, updateOrderStatus, deleteOrder GIỮ NGUYÊN như cũ) ...
function renderPagination(totalItems, totalPages, start, end) {
    if (totalItems === 0) { dom.pagingInfo.innerText = ""; dom.paginationControls.innerHTML = ''; return; }
    dom.pagingInfo.innerText = `Hiển thị ${start + 1} - ${end} của ${totalItems} đơn`;
    const ul = dom.paginationControls;
    ul.innerHTML = '';
    if (totalPages <= 1) return;
    const createBtn = (text, page, active = false, disabled = false) => `
        <li class="page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}">
            <button class="page-link" onclick="window.changePage(${page})">${text}</button>
        </li>`;
    ul.insertAdjacentHTML('beforeend', createBtn('Trước', state.currentPage - 1, false, state.currentPage === 1));
    for (let i = 1; i <= totalPages; i++) {
        ul.insertAdjacentHTML('beforeend', createBtn(i, i, i === state.currentPage));
    }
    ul.insertAdjacentHTML('beforeend', createBtn('Sau', state.currentPage + 1, false, state.currentPage === totalPages));
}
window.changePage = (page) => { state.currentPage = page; renderTable(); };

window.viewDetail = async (id) => {
    try {
        const order = await orderService.getById(id);
        if (!order) return;

        state.currentDetailId = order.orderID;
        dom.detailOrderId.textContent = order.orderID;
        dom.detailDate.textContent = new Date(order.orderTime).toLocaleString('vi-VN');
        dom.detailRestaurant.textContent = order.restaurantName;
        dom.detailTotal.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalAmount);

        dom.detailStatusSelect.value = order.statusID;

        dom.detailItemsBody.innerHTML = '';
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                const row = `
                    <tr>
                        <td>
                            <div class="d-flex align-items-center">
                                <img src="${item.foodImageUrl || '/images/default.png'}" style="width:40px;height:40px;object-fit:cover;" class="rounded me-2 border">
                                <span>${item.foodName}</span>
                            </div>
                        </td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">${item.price.toLocaleString()}</td>
                        <td class="text-end fw-bold">${itemTotal.toLocaleString()}</td>
                    </tr>
                `;
                dom.detailItemsBody.insertAdjacentHTML('beforeend', row);
            });
        } else {
            dom.detailItemsBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Không có món ăn nào</td></tr>';
        }
        dom.modalDetail.show();
    } catch (e) { alert("Lỗi tải chi tiết đơn hàng"); }
};

window.updateOrderStatus = async () => {
    if (!state.currentDetailId) return;
    const newStatusId = parseInt(dom.detailStatusSelect.value);
    try {
        await orderService.updateStatus(state.currentDetailId, newStatusId);
        alert("Cập nhật trạng thái thành công!");
        dom.modalDetail.hide();
        loadOrders();
    } catch (e) { alert("Lỗi cập nhật: " + (e.message || e)); }
};

window.deleteOrder = async (id) => {
    if (confirm("Bạn có chắc chắn muốn xóa đơn hàng này?")) {
        try { await orderService.delete(id); loadOrders(); } catch (e) { alert("Xóa thất bại"); }
    }
};