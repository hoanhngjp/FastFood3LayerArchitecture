import { droneService } from '../services/adminDroneService.js';

const dom = {
    tableBody: document.getElementById('droneTableBody'),
    searchInput: document.getElementById('searchKeyword'),
    filterStatus: document.getElementById('filterStatus'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),

    pagingInfo: document.getElementById('pagingInfo'),
    paginationControls: document.getElementById('paginationControls'),

    modal: new bootstrap.Modal(document.getElementById('droneModal')),
    title: document.getElementById('droneModalTitle'),
    form: document.getElementById('droneForm'),

    // Inputs
    inpId: document.getElementById('droneId'),
    inpModel: document.getElementById('droneModel'),
    inpSerial: document.getElementById('droneSerial'),
    inpMaxLoad: document.getElementById('droneMaxLoad'),
    inpStation: document.getElementById('droneStation'),

    // Edit fields
    divEdit: document.getElementById('editFields'),
    inpBattery: document.getElementById('droneBattery'),
    inpStatus: document.getElementById('droneStatus'),

    btnSave: document.querySelector('#droneModal .btn-primary')
};

let state = {
    rawDrones: [],
    processedDrones: [],
    currentPage: 1,
    pageSize: 10
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadStations(); // Load danh sách trạm trước
    loadDrones();
    setupEvents();
});

function setupEvents() {
    dom.searchInput.addEventListener('input', () => { state.currentPage = 1; processData(); });
    dom.filterStatus.addEventListener('change', () => { state.currentPage = 1; processData(); });
    dom.pageSizeSelect.addEventListener('change', (e) => {
        state.pageSize = parseInt(e.target.value);
        state.currentPage = 1;
        processData();
    });
}

// --- LOAD DATA ---

// 1. Load Stations (Dropdown)
async function loadStations() {
    try {
        const stations = await droneService.getStations();
        let html = '<option value="">-- Chọn Trạm --</option>';

        if (stations && stations.length > 0) {
            stations.forEach(s => {
                html += `<option value="${s.stationID}">${s.name} (${s.address})</option>`;
            });
        } else {
            html = '<option value="">Chưa có dữ liệu trạm</option>';
        }
        dom.inpStation.innerHTML = html;
    } catch (e) {
        console.error(e);
        dom.inpStation.innerHTML = '<option value="">Lỗi tải danh sách trạm</option>';
    }
}

// 2. Load Drones (List)
window.loadDrones = async () => {
    try {
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải dữ liệu...</td></tr>';
        const data = await droneService.getAll();
        state.rawDrones = data || [];
        processData();
    } catch (e) {
        console.error(e);
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Lỗi tải dữ liệu</td></tr>';
    }
};

// --- RENDER & PAGINATION ---

function processData() {
    const keyword = dom.searchInput.value.toLowerCase().trim();
    const statusFilter = dom.filterStatus.value;

    state.processedDrones = state.rawDrones.filter(d => {
        const matchKeyword = (d.model || '').toLowerCase().includes(keyword) ||
            (d.serialNumber || '').toLowerCase().includes(keyword);

        const matchStatus = statusFilter ? d.statusID == statusFilter : true;

        return matchKeyword && matchStatus;
    });

    renderTable();
}

function renderTable() {
    const totalItems = state.processedDrones.length;
    const totalPages = Math.ceil(totalItems / state.pageSize);

    if (state.currentPage > totalPages && totalPages > 0) state.currentPage = 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, totalItems);
    const pageData = state.processedDrones.slice(start, end);

    dom.tableBody.innerHTML = '';

    if (totalItems === 0) {
        dom.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Không có dữ liệu</td></tr>';
        renderPagination(0, 0, 0, 0);
        return;
    }

    pageData.forEach(item => {
        // Battery Color
        let battColor = "text-success";
        let battVal = item.currentBattery || 0;
        if (battVal <= 50) battColor = "text-warning";
        if (battVal <= 20) battColor = "text-danger";

        // SỬA: Status Badge theo ID mới
        // 1:Idle, 2:Charging, 3:Delivering, 4:Busy, 9:Maintenance
        let badgeClass = "bg-secondary";
        if (item.statusID === 1) badgeClass = "bg-success";        // Idle
        else if (item.statusID === 2) badgeClass = "bg-info text-dark"; // Charging
        else if (item.statusID === 3) badgeClass = "bg-primary";   // Delivering
        else if (item.statusID === 4) badgeClass = "bg-warning text-dark"; // Busy
        else if (item.statusID === 9) badgeClass = "bg-danger";    // Maintenance

        const row = `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-dark">${item.model}</div>
                    <small class="text-muted">ID: ${item.droneID}</small>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-geo-alt me-1 text-muted"></i>
                        <span>${item.stationName || 'Chưa gán'}</span>
                    </div>
                </td>
                <td>${item.maxLoad ? item.maxLoad + ' kg' : '-'}</td>
                <td>
                    <i class="bi bi-battery-full ${battColor}"></i> 
                    <strong>${battVal}%</strong>
                </td>
                <td><span class="badge ${badgeClass}">${item.statusName}</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="window.editDrone(${item.droneID})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteDrone(${item.droneID})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
        dom.tableBody.insertAdjacentHTML('beforeend', row);
    });
    renderPagination(totalItems, totalPages, start, end);
}

function renderPagination(totalItems, totalPages, start, end) {
    if (totalItems === 0) {
        dom.pagingInfo.innerText = "0 kết quả";
        dom.paginationControls.innerHTML = '';
        return;
    }
    dom.pagingInfo.innerText = `Hiển thị ${start + 1} - ${end} của ${totalItems} drone`;

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

// --- CRUD ---

window.openDroneModal = () => {
    dom.form.reset();
    dom.inpId.value = '';
    dom.title.innerText = "Thêm Drone Mới";

    // Ẩn phần edit pin/status vì tạo mới luôn mặc định 100% và Idle
    dom.divEdit.style.display = 'none';

    dom.modal.show();
};

window.editDrone = async (id) => {
    try {
        const item = await droneService.getById(id);
        if (!item) return;

        dom.inpId.value = item.droneID;
        dom.inpModel.value = item.model;
        // Dữ liệu API có thể không có serialNumber nếu DTO thiếu, check lại DTO
        dom.inpSerial.value = item.serialNumber || "";
        dom.inpMaxLoad.value = item.maxLoad;
        dom.inpStation.value = item.stationID;

        // Hiện phần edit nâng cao
        dom.divEdit.style.display = 'block';
        dom.inpBattery.value = item.currentBattery;
        dom.inpStatus.value = item.statusID; // StatusID thường là số

        dom.title.innerText = "Cập nhật Drone";
        dom.modal.show();
    } catch (e) { alert("Lỗi tải thông tin"); }
};

window.saveDrone = async () => {
    if (!dom.inpModel.value || !dom.inpStation.value) {
        alert("Model và Trạm là bắt buộc!");
        return;
    }

    try {
        const payload = {
            Model: dom.inpModel.value,
            // Nếu API trả về SerialNumber thì dùng, ko thì fallback
            SerialNumber: "SN-AUTO",
            MaxLoad: parseFloat(dom.inpMaxLoad.value) || 0,
            StationID: parseInt(dom.inpStation.value)
        };

        const id = dom.inpId.value;

        if (id) {
            // Update
            payload.DroneID = parseInt(id);

            // QUAN TRỌNG: Sửa key 'BatteryLevel' thành 'CurrentBattery' để khớp với DTO Backend
            payload.CurrentBattery = parseFloat(dom.inpBattery.value) || 0;

            payload.StatusID = parseInt(dom.inpStatus.value);

            await droneService.update(id, payload);
            alert("Cập nhật thành công!");
        } else {
            // Create
            payload.CurrentBattery = 100;
            await droneService.create(payload);
            alert("Tạo Drone thành công!");
        }
        dom.modal.hide();
        loadDrones();
    } catch (e) {
        console.error(e);
        alert("Lỗi: " + (e.message || e));
    }
};
window.deleteDrone = async (id) => {
    if (confirm("Bạn có chắc muốn xóa Drone này?")) {
        try {
            await droneService.delete(id);
            loadDrones();
        } catch (e) { alert("Xóa thất bại"); }
    }
};