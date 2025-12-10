import { deliveryService } from '../services/adminDeliveryService.js';

const dom = {
    tableBody: document.getElementById('deliveryTableBody'),
    searchInput: document.getElementById('searchKeyword'),
    filterStatus: document.getElementById('filterStatus'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    paginationControls: document.getElementById('paginationControls'),

    // Modal
    modal: new bootstrap.Modal(document.getElementById('deliveryModal')),
    lblId: document.getElementById('modalDeliveryId'),
    lblDrone: document.getElementById('modalDrone'),
    selStatus: document.getElementById('modalStatusSelect')
};

let state = {
    rawDat: [],
    processedDat: [],
    page: 1,
    size: 10,
    currentId: null
};

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEvents();
});

function setupEvents() {
    dom.searchInput.addEventListener('input', () => { state.page = 1; processData(); });
    dom.filterStatus.addEventListener('change', () => { state.page = 1; processData(); });
    dom.pageSizeSelect.addEventListener('change', (e) => { state.size = parseInt(e.target.value); state.page = 1; processData(); });
}

window.loadData = async () => {
    try {
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';
        const data = await deliveryService.getAll();
        state.rawDat = data || [];
        processData();
    } catch (e) {
        console.error(e);
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Lỗi kết nối</td></tr>';
    }
};

function processData() {
    const keyword = dom.searchInput.value.toLowerCase();
    const statusFilter = dom.filterStatus.value;

    state.processedDat = state.rawDat.filter(d => {
        const matchKey = d.deliveryID.toString().includes(keyword) ||
            d.droneModel.toLowerCase().includes(keyword) ||
            d.orderID.toString().includes(keyword);

        const matchStatus = statusFilter ? d.statusName === statusFilter : true;
        return matchKey && matchStatus;
    });

    state.processedDat.sort((a, b) => b.deliveryID - a.deliveryID);
    renderTable();
}

function renderTable() {
    const total = state.processedDat.length;
    const pages = Math.ceil(total / state.size);
    if (state.page > pages && pages > 0) state.page = 1;

    const start = (state.page - 1) * state.size;
    const end = Math.min(start + state.size, total);
    const data = state.processedDat.slice(start, end);

    dom.tableBody.innerHTML = '';
    if (total === 0) {
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>';
        dom.paginationControls.innerHTML = '';
        return;
    }

    data.forEach(item => {
        // Badge color logic mới
        let badgeClass = "bg-secondary";
        const st = item.statusName || "";

        // 1: Assigning Drone
        if (st === "Assigning Drone") badgeClass = "bg-warning text-dark";
        // 2: Picking Up
        else if (st === "Picking Up") badgeClass = "bg-info text-dark";
        // 3: Dropping Off (Đang giao)
        else if (st === "Dropping Off") badgeClass = "bg-primary";
        // 4: Completed
        else if (st === "Completed") badgeClass = "bg-success";
        // 5: Failed
        else if (st === "Failed") badgeClass = "bg-danger";
        // 6: Busy (Trạng thái phụ)
        else if (st === "Busy") badgeClass = "bg-secondary";

        const eta = item.estimatedDropoff ? new Date(item.estimatedDropoff).toLocaleTimeString('vi-VN') : '-';

        const row = `
            <tr>
                <td class="ps-4 fw-bold">#${item.deliveryID}</td>
                <td>
                    <div>Đơn #${item.orderID}</div>
                    <small class="text-muted">${item.customerName}</small>
                </td>
                <td>
                    <i class="bi bi-airplane me-1"></i> ${item.droneModel}
                </td>
                <td>${eta}</td>
                <td><span class="badge ${badgeClass}">${st}</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary" onclick="window.openUpdateModal(${item.deliveryID})">
                        <i class="bi bi-pencil-square"></i> Cập nhật
                    </button>
                </td>
            </tr>
        `;
        dom.tableBody.insertAdjacentHTML('beforeend', row);
    });
    renderPagination(total, pages);
}

function renderPagination(total, pages) {
    const ul = dom.paginationControls;
    ul.innerHTML = '';
    if (pages <= 1) return;

    const createBtn = (text, p, active) => `
        <li class="page-item ${active ? 'active' : ''}">
            <button class="page-link" onclick="window.changePage(${p})">${text}</button>
        </li>`;

    ul.insertAdjacentHTML('beforeend', createBtn('Trước', Math.max(1, state.page - 1), false));
    for (let i = 1; i <= pages; i++) {
        ul.insertAdjacentHTML('beforeend', createBtn(i, i, i === state.page));
    }
    ul.insertAdjacentHTML('beforeend', createBtn('Sau', Math.min(pages, state.page + 1), false));
}
window.changePage = (p) => { state.page = p; renderTable(); };

// --- ACTIONS ---
window.openUpdateModal = async (id) => {
    state.currentId = id;
    const item = state.rawDat.find(x => x.deliveryID === id);
    if (item) {
        dom.lblId.textContent = id;
        dom.lblDrone.textContent = `${item.droneModel} (${item.serialNumber})`;
        dom.selStatus.value = item.statusID; // Set trạng thái hiện tại
        dom.modal.show();
    }
};

window.updateDeliveryStatus = async () => {
    if (!state.currentId) return;
    const newStatus = parseInt(dom.selStatus.value);

    try {
        await deliveryService.updateStatus(state.currentId, newStatus);
        alert("Cập nhật thành công!");
        dom.modal.hide();
        loadData();
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};