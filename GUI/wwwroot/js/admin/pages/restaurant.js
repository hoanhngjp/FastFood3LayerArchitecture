import { restaurantService } from '../services/adminRestaurantService.js';

// --- DOM ELEMENTS ---
const dom = {
    tableBody: document.getElementById('resTableBody'),
    searchInput: document.getElementById('searchKeyword'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    pagingInfo: document.getElementById('pagingInfo'),
    paginationControls: document.getElementById('paginationControls'),

    modal: new bootstrap.Modal(document.getElementById('resModal')),
    form: document.getElementById('resForm'),
    title: document.getElementById('resModalTitle'),

    // Inputs (Cần khớp ID với HTML)
    inpId: document.getElementById('resId'),
    inpName: document.getElementById('resName'),
    inpAddress: document.getElementById('resAddress'),
    inpPhone: document.getElementById('resPhone'),
    inpHours: document.getElementById('resHours'),
    inpManager: document.getElementById('resManager'), // <-- Lỗi của bạn ở dòng này nếu HTML thiếu id="resManager"
    inpStatus: document.getElementById('resStatus'),

    btnSave: document.querySelector('#resModal .btn-primary')
};

// --- STATE ---
let state = {
    rawRestaurants: [],
    processedRestaurants: [],
    currentPage: 1,
    pageSize: 5,
    originalAddress: '',
    originalLat: null,
    originalLng: null
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Managers
    await loadManagers();
    // 2. Load Restaurants
    loadRestaurants();

    setupEvents();
});

function setupEvents() {
    dom.searchInput.addEventListener('input', () => { state.currentPage = 1; processData(); });
    dom.pageSizeSelect.addEventListener('change', (e) => { state.pageSize = parseInt(e.target.value); state.currentPage = 1; processData(); });
}

// --- LOAD DATA ---
async function loadManagers() {
    try {
        const managers = await restaurantService.getManagers();
        if (managers && managers.length > 0) {
            let html = '<option value="">-- Chọn quản lý --</option>';
            managers.forEach(m => {
                const id = m.userID || m.UserID;
                const label = m.fullName || m.FullName;
                const email = m.email || m.Email;
                html += `<option value="${id}">${label} (${email})</option>`;
            });
            dom.inpManager.innerHTML = html;
        } else {
            dom.inpManager.innerHTML = '<option value="">Không có Manager nào</option>';
        }
    } catch (e) {
        console.error("Lỗi load managers:", e);
        dom.inpManager.innerHTML = '<option value="">Lỗi kết nối</option>';
    }
}

window.loadRestaurants = async () => {
    try {
        dom.tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Đang tải dữ liệu...</td></tr>';
        const data = await restaurantService.getAll();
        state.rawRestaurants = data || [];
        processData();
    } catch (e) {
        console.error(e);
        dom.tableBody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Lỗi tải dữ liệu</td></tr>';
    }
};

// --- RENDER ---
function processData() {
    const keyword = dom.searchInput.value.toLowerCase().trim();
    state.processedRestaurants = state.rawRestaurants.filter(item => {
        const name = (item.name || '').toLowerCase();
        const address = (item.address || '').toLowerCase();
        return name.includes(keyword) || address.includes(keyword);
    });
    renderTable();
}

function renderTable() {
    const totalItems = state.processedRestaurants.length;
    const totalPages = Math.ceil(totalItems / state.pageSize);
    if (state.currentPage > totalPages && totalPages > 0) state.currentPage = 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, totalItems);
    const pageData = state.processedRestaurants.slice(start, end);

    dom.tableBody.innerHTML = '';
    if (totalItems === 0) {
        dom.tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Không có dữ liệu</td></tr>';
        renderPagination(0, 0, 0, 0);
        return;
    }

    pageData.forEach(item => {
        let badgeClass = "bg-secondary";
        let statusText = item.statusName || "Unknown";
        if (item.statusID === 1) { badgeClass = "bg-success"; statusText = "Opening"; }
        else if (item.statusID === 2) { badgeClass = "bg-danger"; statusText = "Closed"; }
        else if (item.statusID === 3) { badgeClass = "bg-warning text-dark"; statusText = "Suspended"; }

        const row = `
            <tr>
                <td class="ps-4">
                    <div class="fw-bold text-primary">${item.name}</div>
                    <small class="text-muted" style="font-size: 0.75rem;">
                        <i class="bi bi-clock"></i> ${item.openingHours || '...'} |
                        Lat: ${item.location_Lat?.toFixed(4) || '_'}, Lng: ${item.location_Lng?.toFixed(4) || '_'}
                    </small>
                </td>
                <td>${item.address}</td>
                <td><span class="badge ${badgeClass}">${statusText}</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="window.editRes(${item.restaurantID})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteRes(${item.restaurantID})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
        dom.tableBody.insertAdjacentHTML('beforeend', row);
    });
    renderPagination(totalItems, totalPages, start, end);
}

function renderPagination(totalItems, totalPages, start, end) {
    if (totalItems === 0) {
        dom.pagingInfo.innerText = "";
        dom.paginationControls.innerHTML = '';
        return;
    }
    dom.pagingInfo.innerText = `Hiển thị ${start + 1} - ${end} của ${totalItems} nhà hàng`;
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

// --- CRUD & GEOCODING ---
window.openResModal = () => {
    dom.form.reset();
    dom.inpId.value = '';
    dom.title.innerText = "Thêm nhà hàng mới";
    dom.inpStatus.value = "1";
    dom.inpManager.value = "";

    state.originalAddress = '';
    state.originalLat = null;
    state.originalLng = null;
    dom.modal.show();
};

window.editRes = async (id) => {
    try {
        const item = await restaurantService.getById(id);
        if (!item) return;

        dom.inpId.value = item.restaurantID;
        dom.inpName.value = item.name;
        dom.inpAddress.value = item.address;
        dom.inpPhone.value = item.phoneNumber;
        dom.inpHours.value = item.openingHours || "";
        dom.inpStatus.value = item.statusID;

        // BIND MANAGER
        const mgrId = item.managerID || item.ManagerID;
        if (mgrId && dom.inpManager.querySelector(`option[value="${mgrId}"]`)) {
            dom.inpManager.value = mgrId;
        } else {
            console.warn("ManagerID không tồn tại trong danh sách:", mgrId);
        }

        state.originalAddress = item.address;
        state.originalLat = item.location_Lat;
        state.originalLng = item.location_Lng;

        dom.title.innerText = "Cập nhật nhà hàng";
        dom.modal.show();
    } catch (e) { alert("Lỗi tải thông tin"); }
};

window.saveRestaurant = async () => {
    if (!dom.inpName.value || !dom.inpAddress.value || !dom.inpManager.value) {
        alert("Vui lòng nhập đủ Tên, Địa chỉ và chọn Quản lý!");
        return;
    }

    const originalBtnText = dom.btnSave.innerHTML;
    dom.btnSave.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';
    dom.btnSave.disabled = true;

    try {
        const newAddress = dom.inpAddress.value;
        let lat = state.originalLat;
        let lng = state.originalLng;

        // Logic Geocoding
        if (!dom.inpId.value || newAddress !== state.originalAddress) {
            console.log("Tìm tọa độ mới...");
            const geoData = await geocodeAddress(newAddress);
            if (geoData) {
                lat = parseFloat(geoData.lat);
                lng = parseFloat(geoData.lon);
            } else {
                let msg = `Không tìm thấy tọa độ cho: "${newAddress}".`;
                if (dom.inpId.value && state.originalLat) {
                    if (confirm(`${msg}\nGiữ lại tọa độ cũ không?`)) {
                        lat = state.originalLat;
                        lng = state.originalLng;
                    } else {
                        lat = null; lng = null;
                    }
                } else {
                    if (!confirm(`${msg}\nLưu mà không có tọa độ?`)) throw new Error("Hủy lưu.");
                    lat = null; lng = null;
                }
            }
        }

        const payload = {
            Name: dom.inpName.value,
            Address: dom.inpAddress.value,
            PhoneNumber: dom.inpPhone.value,
            OpeningHours: dom.inpHours.value,
            StatusID: parseInt(dom.inpStatus.value),
            ManagerID: parseInt(dom.inpManager.value),
            Location_Lat: lat,
            Location_Lng: lng
        };

        const id = dom.inpId.value;
        if (id) {
            payload.RestaurantId = parseInt(id);
            await restaurantService.update(id, payload);
            alert("Cập nhật thành công!");
        } else {
            await restaurantService.create(payload);
            alert("Thêm mới thành công!");
        }
        dom.modal.hide();
        loadRestaurants();

    } catch (e) {
        if (e.message !== "Hủy lưu.") alert("Lỗi: " + (e.message || e));
    } finally {
        dom.btnSave.innerHTML = originalBtnText;
        dom.btnSave.disabled = false;
    }
};

window.deleteRes = async (id) => {
    if (confirm("Xóa nhà hàng này?")) {
        try { await restaurantService.delete(id); loadRestaurants(); }
        catch (e) { alert("Xóa thất bại"); }
    }
};

async function geocodeAddress(address) {
    const callApi = async (q) => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=vn`;
            const res = await fetch(url, { headers: { 'User-Agent': 'App/1.0' } });
            if (!res.ok) return null;
            const d = await res.json();
            return (d && d.length > 0) ? d[0] : null;
        } catch { return null; }
    };
    let res = await callApi(address);
    if (res) return res;

    // Thử bỏ số nhà
    const st = address.replace(/^[0-9]+[\/A-Za-z0-9]*\s+(đường\s+)?/i, "");
    if (st !== address) {
        res = await callApi(st);
        if (res) return res;
    }
    return null;
}