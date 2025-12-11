import { getMyAddresses, addAddress, updateAddress, deleteAddress } from './services/addressService.js';
const { Modal } = window.bootstrap || {};

const listContainerEl = document.getElementById('address-list-container');
const modalFormEl = document.getElementById('add-address-form');
const modalEl = Modal ? new Modal(document.getElementById('addAddressModal')) : null;
const modalTitleEl = document.getElementById('addAddressModalLabel');
const statusEl = document.getElementById('location-status');
const inputAddress = document.getElementById('inputDetailedAddress');

// Biến lưu tọa độ tạm thời
let currentLat = 0;
let currentLng = 0;

// --- 1. CÁC HÀM GỌI API BẢN ĐỒ (OPENSTREETMAP) ---

/**
 * Forward Geocoding: Địa chỉ -> Tọa độ
 */
async function geocodeForward(address) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=vn`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    } catch (e) {
        console.error("Lỗi Geocode Forward:", e);
        return null;
    }
}

/**
 * Reverse Geocoding: Tọa độ -> Địa chỉ
 */
async function geocodeReverse(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data ? data.display_name : null;
    } catch (e) {
        console.error("Lỗi Geocode Reverse:", e);
        return null;
    }
}

// --- 2. XỬ LÝ SỰ KIỆN NÚT "ĐỊNH VỊ" ---

async function handleLocateButtonClick() {
    const btn = document.getElementById('btn-get-location');
    const originalText = btn.innerHTML;
    const addressVal = inputAddress.value.trim();

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang xử lý...';
    statusEl.innerHTML = '';

    // TRƯỜNG HỢP A: Textbox CÓ địa chỉ -> Tìm tọa độ theo địa chỉ
    if (addressVal) {
        statusEl.innerHTML = '<small class="text-muted">Đang tìm tọa độ cho địa chỉ...</small>';

        const coords = await geocodeForward(addressVal);

        if (coords) {
            currentLat = coords.lat;
            currentLng = coords.lng;
            statusEl.innerHTML = `<small class="text-success"><i class="bi bi-check-circle"></i> Đã tìm thấy tọa độ: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}</small>`;
        } else {
            statusEl.innerHTML = `<small class="text-danger"><i class="bi bi-x-circle"></i> Không tìm thấy tọa độ trên bản đồ.</small>`;
            // Reset tọa độ cũ để tránh sai lệch
            currentLat = 0;
            currentLng = 0;
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    }
    // TRƯỜNG HỢP B: Textbox RỖNG -> Lấy GPS hiện tại -> Điền địa chỉ
    else {
        if (!navigator.geolocation) {
            alert("Trình duyệt không hỗ trợ định vị.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        statusEl.innerHTML = '<small class="text-muted">Đang lấy vị trí GPS...</small>';

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                currentLat = position.coords.latitude;
                currentLng = position.coords.longitude;

                statusEl.innerHTML = `<small class="text-success"><i class="bi bi-geo-fill"></i> GPS: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}. Đang tìm tên đường...</small>`;

                // Gọi Reverse Geocoding để lấy tên đường
                const addressName = await geocodeReverse(currentLat, currentLng);

                if (addressName) {
                    inputAddress.value = addressName; // Điền vào textbox
                    statusEl.innerHTML = `<small class="text-success"><i class="bi bi-check-circle"></i> Đã cập nhật vị trí hiện tại.</small>`;
                } else {
                    statusEl.innerHTML = `<small class="text-warning"><i class="bi bi-exclamation-triangle"></i> Lấy được tọa độ nhưng không tìm thấy tên đường.</small>`;
                }

                btn.innerHTML = originalText;
                btn.disabled = false;
            },
            (error) => {
                let msg = "Lỗi GPS.";
                if (error.code === 1) msg = "Bạn đã từ chối quyền truy cập vị trí.";
                statusEl.innerHTML = `<small class="text-danger">${msg}</small>`;
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        );
    }
}

// --- 3. CÁC HÀM RENDER & LOGIC CŨ (Đã tinh chỉnh) ---

function renderAddresses(addresses) {
    listContainerEl.innerHTML = '';
    if (!addresses || addresses.length === 0) {
        listContainerEl.innerHTML = `<div class="alert alert-info text-center mt-3"><i class="bi bi-info-circle me-2"></i> Bạn chưa lưu địa chỉ giao hàng nào.</div>`;
        return;
    }

    const html = addresses.map(addr => `
        <div class="card mb-3 shadow-sm ${addr.isDefault ? 'border-warning border-2' : 'border-light'}">
            <div class="card-body">
                <h5 class="card-title fw-bold">${addr.adrsCustomerName || 'Khách hàng'} 
                    ${addr.isDefault ? '<span class="badge bg-warning text-dark ms-2">Mặc định</span>' : ''}
                </h5>
                <p class="card-text mb-1"><i class="bi bi-telephone me-2"></i> ${addr.phone}</p>
                <p class="card-text text-muted"><i class="bi bi-geo-alt me-2"></i> ${addr.adrsLine}</p>
                <small class="text-muted d-none" style="font-size:0.7rem">Lat: ${addr.latitude}, Lng: ${addr.longitude}</small>
                
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-primary me-2 edit-address-btn" 
                            data-id="${addr.adrsID}" data-bs-toggle="modal" data-bs-target="#addAddressModal">
                        Sửa
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-address-btn" data-id="${addr.adrsID}">
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    listContainerEl.innerHTML = html;

    document.querySelectorAll('.edit-address-btn').forEach(btn => {
        btn.addEventListener('click', () => loadAddressForEdit(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.delete-address-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteAddress(parseInt(btn.dataset.id)));
    });
}

async function loadAddresses() {
    listContainerEl.innerHTML = '<div class="text-center p-5"><span class="spinner-border text-warning" role="status"></span> Đang tải...</div>';
    try {
        const addresses = await getMyAddresses();
        renderAddresses(addresses);
    } catch (error) {
        listContainerEl.innerHTML = `<div class="alert alert-danger">Lỗi tải địa chỉ: ${error.message}</div>`;
    }
}

function handleNewAddressClick() {
    modalFormEl.reset();
    document.getElementById('address-id-input').value = 0;
    currentLat = 0;
    currentLng = 0;
    statusEl.innerHTML = '';
    if (modalTitleEl) modalTitleEl.textContent = 'Thêm Địa chỉ Mới';
    document.getElementById('save-address-btn').innerHTML = '<i class="bi bi-plus-circle me-2"></i> Lưu Địa chỉ';
}

async function loadAddressForEdit(id) {
    if (!id) return;
    try {
        const addresses = await getMyAddresses();
        const address = addresses.find(a => a.adrsID === id);

        if (address) {
            document.getElementById('address-id-input').value = address.adrsID;
            document.getElementById('inputReceiverName').value = address.adrsCustomerName;
            document.getElementById('inputReceiverPhone').value = address.phone;
            document.getElementById('inputDetailedAddress').value = address.adrsLine;
            document.getElementById('inputIsDefault').checked = address.isDefault;

            currentLat = address.latitude || 0;
            currentLng = address.longitude || 0;

            if (currentLat !== 0) {
                statusEl.innerHTML = `<small class="text-success"><i class="bi bi-geo-alt"></i> Đã có tọa độ: ${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}</small>`;
            } else {
                statusEl.innerHTML = '';
            }

            if (modalTitleEl) modalTitleEl.textContent = `Sửa Địa chỉ ID: ${id}`;
            document.getElementById('save-address-btn').innerHTML = '<i class="bi bi-save me-2"></i> Cập nhật';
        }
    } catch (error) {
        alert(`Lỗi: ${error.message}`);
    }
}

async function handleDeleteAddress(id) {
    if (confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) {
        try {
            await deleteAddress(id);
            alert("Xóa địa chỉ thành công!");
            loadAddresses();
        } catch (error) {
            alert(`Lỗi xóa: ${error.message}`);
        }
    }
}

// --- 4. XỬ LÝ LƯU (TỰ ĐỘNG ĐỊNH VỊ NẾU CẦN) ---

async function handleAddOrUpdateAddress(e) {
    e.preventDefault();

    // UI Loading cho nút Lưu
    const btnSave = document.getElementById('save-address-btn');
    const originalBtnText = btnSave.innerHTML;
    btnSave.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang lưu...';
    btnSave.disabled = true;

    try {
        const id = parseInt(document.getElementById('address-id-input').value);
        const addressStr = document.getElementById('inputDetailedAddress').value.trim();

        // LOGIC TỰ ĐỘNG LẤY TỌA ĐỘ NẾU CHƯA CÓ
        // Nếu người dùng chưa bấm nút "Định vị" (lat/lng = 0) nhưng đã nhập địa chỉ
        if ((currentLat === 0 || currentLng === 0) && addressStr) {
            statusEl.innerHTML = '<small class="text-muted">Đang tự động tìm tọa độ...</small>';
            console.log("Auto-geocoding for:", addressStr);

            const coords = await geocodeForward(addressStr);
            if (coords) {
                currentLat = coords.lat;
                currentLng = coords.lng;
                statusEl.innerHTML = `<small class="text-success">Tự động lấy tọa độ: ${currentLat.toFixed(4)}</small>`;
            } else {
                // Nếu không tìm thấy, có thể cảnh báo hoặc chấp nhận lưu không tọa độ
                console.warn("Không tìm thấy tọa độ tự động.");
            }
        }

        let data = {
            AdrsCustomerName: document.getElementById('inputReceiverName').value,
            Phone: document.getElementById('inputReceiverPhone').value,
            AdrsLine: addressStr,
            IsDefault: document.getElementById('inputIsDefault').checked,
            Latitude: currentLat,
            Longitude: currentLng
        };

        if (id === 0) {
            await addAddress(data);
            alert("Thêm địa chỉ thành công!");
        } else {
            data.AdrsID = id;
            await updateAddress(id, data);
            alert("Cập nhật địa chỉ thành công!");
        }

        if (modalEl) modalEl.hide();
        loadAddresses();

    } catch (error) {
        console.error(error);
        alert(`Thao tác thất bại: ${error.message}`);
    } finally {
        btnSave.innerHTML = originalBtnText;
        btnSave.disabled = false;
    }
}

// --- INIT ---

document.addEventListener('DOMContentLoaded', function () {
    const addressesTabButton = document.getElementById('addresses-tab');
    if (addressesTabButton) addressesTabButton.addEventListener('shown.bs.tab', loadAddresses);

    if (modalFormEl) modalFormEl.addEventListener('submit', handleAddOrUpdateAddress);

    const addAddressModalEl = document.getElementById('addAddressModal');
    if (addAddressModalEl) {
        addAddressModalEl.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            if (button && !button.classList.contains('edit-address-btn')) {
                handleNewAddressClick();
            }
        });
    }

    const btnGetLocation = document.getElementById('btn-get-location');
    if (btnGetLocation) {
        // Thay hàm cũ bằng hàm mới handleLocateButtonClick
        btnGetLocation.addEventListener('click', handleLocateButtonClick);
    }

    if (addressesTabButton && addressesTabButton.classList.contains('active')) {
        loadAddresses();
    }
});p