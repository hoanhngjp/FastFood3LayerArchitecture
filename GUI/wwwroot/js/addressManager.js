// /js/addressManager.js (ĐỒNG BỘ VỚI AddressDTO CỦA BẠN)

import { getMyAddresses, addAddress, updateAddress, deleteAddress } from './services/addressService.js';
const { Modal } = window.bootstrap || {};

const listContainerEl = document.getElementById('address-list-container');
const modalFormEl = document.getElementById('add-address-form');
const modalEl = Modal ? new Modal(document.getElementById('addAddressModal')) : null;
const modalTitleEl = document.getElementById('addAddressModalLabel');


// --- Render Functions ---

/**
 * Hiển thị danh sách địa chỉ.
 */
function renderAddresses(addresses) {
    listContainerEl.innerHTML = '';
    if (addresses.length === 0) {
        listContainerEl.innerHTML = `<div class="alert alert-info text-center mt-3"><i class="bi bi-info-circle me-2"></i> Bạn chưa lưu địa chỉ giao hàng nào.</div>`;
        return;
    }

    // SỬ DỤNG TÊN THUỘC TÍNH MỚI: adrsCustomerName, phone, adrsLine
    const html = addresses.map(addr => `
        <div class="card mb-3 shadow-sm ${addr.isDefault ? 'border-warning border-2' : 'border-light'}">
            <div class="card-body">
                <h5 class="card-title fw-bold">${addr.adrsCustomerName} 
                    ${addr.isDefault ? '<span class="badge bg-warning text-dark ms-2">Mặc định</span>' : ''}
                </h5>
                <p class="card-text mb-1"><i class="bi bi-telephone me-2"></i> ${addr.phone}</p>
                <p class="card-text text-muted"><i class="bi bi-geo-alt me-2"></i> ${addr.adrsLine}, ${addr.ward}, ${addr.city}</p>
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

/**
 * Tải danh sách địa chỉ từ API.
 */
async function loadAddresses() {
    listContainerEl.innerHTML = '<div class="text-center p-5"><span class="spinner-border text-warning" role="status"></span> Đang tải...</div>';
    try {
        const addresses = await getMyAddresses();
        renderAddresses(addresses);
    } catch (error) {
        listContainerEl.innerHTML = `<div class="alert alert-danger">Lỗi tải địa chỉ: ${error.message}</div>`;
        console.error(error);
    }
}

/**
 * Xử lý sự kiện khi click nút Thêm mới
 */
function handleNewAddressClick() {
    modalFormEl.reset();
    document.getElementById('address-id-input').value = 0;
    if (modalTitleEl) modalTitleEl.textContent = 'Thêm Địa chỉ Mới';
    document.getElementById('save-address-btn').innerHTML = '<i class="bi bi-plus-circle me-2"></i> Lưu Địa chỉ';
}

/**
 * Load dữ liệu địa chỉ vào form Modal để sửa.
 */
async function loadAddressForEdit(id) {
    if (!id) return;
    try {
        const addresses = await getMyAddresses();
        const address = addresses.find(a => a.adrsID === id);

        if (address) {
            // SỬ DỤNG TÊN THUỘC TÍNH MỚI CHO FORM INPUTS (GIẢ ĐỊNH BE SỬ DỤNG camelCase KHI TRẢ VỀ JSON)
            document.getElementById('address-id-input').value = address.adrsID;
            document.getElementById('inputReceiverName').value = address.adrsCustomerName;
            document.getElementById('inputReceiverPhone').value = address.phone;
            document.getElementById('inputCity').value = address.city;
            document.getElementById('inputWard').value = address.ward;
            document.getElementById('inputDetailedAddress').value = address.adrsLine;
            document.getElementById('inputIsDefault').checked = address.isDefault;

            if (modalTitleEl) modalTitleEl.textContent = `Sửa Địa chỉ ID: ${id}`;
            document.getElementById('save-address-btn').innerHTML = '<i class="bi bi-save me-2"></i> Cập nhật';
        } else {
            alert("Không tìm thấy địa chỉ này.");
        }
    } catch (error) {
        alert(`Lỗi khi tải địa chỉ: ${error.message}`);
    }
}

/**
 * Xử lý sự kiện Xóa địa chỉ.
 */
async function handleDeleteAddress(id) {
    if (confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) {
        try {
            await deleteAddress(id);
            alert("Xóa địa chỉ thành công!");
            loadAddresses();
        } catch (error) {
            alert(`Lỗi xóa địa chỉ: ${error.message}`);
        }
    }
}


/**
 * Xử lý sự kiện khi form Modal được submit (Thêm/Sửa).
 */
async function handleAddOrUpdateAddress(e) {
    e.preventDefault();

    const id = parseInt(document.getElementById('address-id-input').value);

    // TẠO OBJECT VỚI TÊN THUỘC TÍNH PASCALCASE ĐỂ GỬI LÊN BE
    let data = {
        // Đã đồng bộ với AddressDTO của bạn
        AdrsCustomerName: document.getElementById('inputReceiverName').value,
        Phone: document.getElementById('inputReceiverPhone').value,

        // Giả định City/Ward vẫn hoạt động (chưa thấy lỗi validation)
        City: document.getElementById('inputCity').value,
        Ward: document.getElementById('inputWard').value,

        AdrsLine: document.getElementById('inputDetailedAddress').value,

        IsDefault: document.getElementById('inputIsDefault').checked
    };

    try {
        if (id === 0) {
            // Thêm mới: KHÔNG GỬI AdrsID
            await addAddress(data);
            alert("Thêm địa chỉ thành công!");
        } else {
            // Cập nhật: PHẢI GỬI AdrsID
            data.AdrsID = id;
            await updateAddress(id, data);
            alert("Cập nhật địa chỉ thành công!");
        }

        if (modalEl) modalEl.hide();
        loadAddresses();

    } catch (error) {
        console.error('Thao tác API thất bại:', error);
        alert(`Thao tác thất bại: ${error.message}`);
    }
}


// --- Khởi tạo (Initialization) ---

document.addEventListener('DOMContentLoaded', function () {
    const addressesTabButton = document.getElementById('addresses-tab');

    if (addressesTabButton) {
        addressesTabButton.addEventListener('shown.bs.tab', loadAddresses);
    }

    if (modalFormEl) {
        modalFormEl.addEventListener('submit', handleAddOrUpdateAddress);
    }

    const addAddressModalEl = document.getElementById('addAddressModal');
    if (addAddressModalEl) {
        addAddressModalEl.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            if (button && !button.classList.contains('edit-address-btn')) {
                handleNewAddressClick();
            }
        });
    }

    if (addressesTabButton && addressesTabButton.classList.contains('active')) {
        loadAddresses();
    }
});