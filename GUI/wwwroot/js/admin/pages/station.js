import { stationService } from '../services/adminStationService.js';

const dom = {
    tableBody: document.getElementById('stationTableBody'),
    modal: new bootstrap.Modal(document.getElementById('stationModal')),
    title: document.getElementById('stationModalTitle'),
    inpId: document.getElementById('stationId'),
    inpName: document.getElementById('stationName'),
    inpAddress: document.getElementById('stationAddress'),
    btnSave: document.getElementById('btnSaveStation')
};

let state = { originalAddress: '', originalLat: null, originalLng: null };

document.addEventListener('DOMContentLoaded', loadStations);

async function loadStations() {
    try {
        const data = await stationService.getAll();
        dom.tableBody.innerHTML = '';
        data.forEach(item => {
            const row = `<tr>
                <td class="ps-4 fw-bold">${item.name}</td>
                <td>${item.address}</td>
                <td><small class="text-muted">${item.location_Lat?.toFixed(5) || '_'}, ${item.location_Lng?.toFixed(5) || '_'}</small></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary" onclick="window.editStation(${item.stationID})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteStation(${item.stationID})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
            dom.tableBody.insertAdjacentHTML('beforeend', row);
        });
    } catch (e) { console.error(e); }
}

window.openStationModal = () => {
    document.getElementById('stationForm').reset();
    dom.inpId.value = '';
    dom.title.innerText = "Thêm Trạm Mới";
    state.originalAddress = ''; state.originalLat = null; state.originalLng = null;
    dom.modal.show();
};

window.editStation = async (id) => {
    const item = await stationService.getById(id);
    if (!item) return;
    dom.inpId.value = item.stationID;
    dom.inpName.value = item.name;
    dom.inpAddress.value = item.address;
    state.originalAddress = item.address;
    state.originalLat = item.location_Lat;
    state.originalLng = item.location_Lng;
    dom.title.innerText = "Cập nhật Trạm";
    dom.modal.show();
};

window.saveStation = async () => {
    if (!dom.inpName.value || !dom.inpAddress.value) return alert("Nhập đủ thông tin!");

    dom.btnSave.disabled = true;
    dom.btnSave.innerHTML = "Đang xử lý...";

    try {
        const newAddress = dom.inpAddress.value;
        let lat = state.originalLat, lng = state.originalLng;

        if (!dom.inpId.value || newAddress !== state.originalAddress) {
            const geo = await geocodeAddress(newAddress);
            if (geo) {
                lat = parseFloat(geo.lat); lng = parseFloat(geo.lon);
            } else if (!confirm("Không tìm thấy tọa độ. Vẫn lưu?")) {
                throw new Error("Hủy");
            } else {
                lat = null; lng = null;
            }
        }

        const payload = {
            Name: dom.inpName.value,
            Address: dom.inpAddress.value,
            Location_Lat: lat,
            Location_Lng: lng
        };

        const id = dom.inpId.value;
        if (id) {
            payload.StationID = parseInt(id);
            await stationService.update(id, payload);
        } else {
            await stationService.create(payload);
        }
        dom.modal.hide();
        loadStations();
    } catch (e) { if (e.message !== "Hủy") alert("Lỗi: " + e); }
    finally { dom.btnSave.disabled = false; dom.btnSave.innerHTML = "Lưu lại"; }
};

window.deleteStation = async (id) => {
    if (confirm("Xóa trạm này?")) {
        try { await stationService.delete(id); loadStations(); } catch (e) { alert("Lỗi xóa"); }
    }
};

// Hàm Geocode dùng chung (bạn có thể tách ra file utils.js để tái sử dụng)
async function geocodeAddress(address) {
    /* Copy logic geocode từ file restaurant.js sang đây */
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=vn`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data[0];
    } catch { return null; }
}