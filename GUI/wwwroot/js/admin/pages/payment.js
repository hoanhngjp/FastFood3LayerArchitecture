import { paymentService } from '../services/adminPaymentService.js';

const dom = {
    tableBody: document.getElementById('paymentTableBody'),
    searchInput: document.getElementById('searchKeyword'),
    filterStatus: document.getElementById('filterStatus'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    paginationControls: document.getElementById('paginationControls')
};

let state = {
    rawDat: [],
    processedDat: [],
    page: 1,
    size: 10
};

document.addEventListener('DOMContentLoaded', () => {
    loadPayments();
    setupEvents();
});

function setupEvents() {
    dom.searchInput.addEventListener('input', () => { state.page = 1; processData(); });
    dom.filterStatus.addEventListener('change', () => { state.page = 1; processData(); });
    dom.pageSizeSelect.addEventListener('change', (e) => { state.size = parseInt(e.target.value); state.page = 1; processData(); });
}

window.loadPayments = async () => {
    try {
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';
        const data = await paymentService.getAll();
        state.rawDat = data || [];
        processData();
    } catch (e) {
        console.error(e);
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Lỗi kết nối</td></tr>';
    }
};

function processData() {
    const keyword = dom.searchInput.value.toLowerCase().trim();
    const statusFilter = dom.filterStatus.value;

    state.processedDat = state.rawDat.filter(item => {
        // Tìm theo TransactionNo hoặc OrderID
        const matchKey = (item.transactionNo || '').toLowerCase().includes(keyword) ||
            item.orderID.toString().includes(keyword);

        // Lọc theo StatusID (1 hoặc 2)
        const matchStatus = statusFilter ? item.statusID == statusFilter : true;

        return matchKey && matchStatus;
    });

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
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Không có dữ liệu</td></tr>';
        dom.paginationControls.innerHTML = '';
        return;
    }

    data.forEach(item => {
        // Badge
        let badgeClass = "bg-secondary";
        let statusText = item.statusName;

        if (item.statusID === 1) { // Success
            badgeClass = "bg-success";
            statusText = "Success";
        } else if (item.statusID === 2) { // Failed
            badgeClass = "bg-danger";
            statusText = "Failed";
        }

        // Format tiền tệ & Ngày
        const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount);
        const date = item.paymentDate ? new Date(item.paymentDate).toLocaleString('vi-VN') : '-';

        const row = `
            <tr>
                <td class="ps-4 font-monospace small">${item.transactionNo || 'N/A'}</td>
                <td>
                    <div class="fw-bold text-dark">Đơn #${item.orderID}</div>
                    <small class="text-muted">${item.customerName}</small>
                </td>
                <td class="fw-bold text-primary">${price}</td>
                <td><span class="badge bg-light text-dark border">${item.bankCode || 'VNPAY'}</span></td>
                <td>${date}</td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
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