/**
 * js/addressManager.js
 * Quản lý Tab Địa chỉ Giao hàng.
 * Đăng ký vào <script type="module" src="/js/addressManager.js"></script>
 */
import { addressService } from './services/addressService.js';

const addressListContainer = document.getElementById('address-list-container');
const addAddressForm = document.getElementById('add-address-form');
const addAddressModalEl = document.getElementById('addAddressModal');
const addAddressModal = new bootstrap.Modal(addAddressModalEl);
const modalTitle = document.getElementById('addAddressModalLabel');
const saveAddressBtn = document.getElementById('save-address-btn');

// --- Helper Functions ---

function formatAddress(address) {
    const fullAddress = `${address.detailedAddress}, ${address.ward}, ${address.city}`;
    const isDefaultBadge = address.isDefault ? '<span class="badge bg-warning text-dark ms-2">Mặc định</span>' : '';
    const defaultText = address.isDefault ? ' (Mặc định)' : '';

    return `
        <div class="card shadow-sm mb-3">
            <div class="card-body">
                <h5 class="card-title fw-bold text-dark-orange">
                    ${address.receiverName} ${isDefaultBadge}
                </h5>
                <p class="card-text mb-1">
                    <i class="bi bi-telephone-fill me-2"></i> ${address.receiverPhone}
                </p>
                <p class="card-text text-muted mb-3">
                    <i class="bi bi-geo-alt-fill me-2"></i> ${fullAddress}
                </p>
                <button type="button" class="btn btn-outline-warning btn-sm me-2 edit-address-btn" data-id="${address.adrsID}">
                    <i class="bi bi-pencil"></i> Chỉnh sửa
                </button>
                <button type="button" class="btn btn-outline-danger btn-sm delete-address-btn" data-id="${address.adrsID}">
                    <i class="bi bi-trash"></i> Xóa
                </button>
            </div>
        </div>
    `;
}

function resetAddressForm() {
    addAddressForm.reset();
    document.getElementById('address-id-input').value = 0;
    modalTitle.innerHTML = '<i class="bi bi-geo-alt me-2"></i> Thêm Địa chỉ Mới';
    saveAddressBtn.innerHTML = '<i class="bi bi-plus-circle me-2"></i> Lưu Địa chỉ';
}

// --- Main Logic ---

/**
 * Tải và hiển thị danh sách địa chỉ.
 */
export async function loadAddresses() {
    addressListContainer.innerHTML = '<div class="text-center p-5"><span class="spinner-border text-warning" role="status"></span> Đang tải...</div>';
    try {
        const addresses = await addressService.getAddresses();
        
        if (!addresses || addresses.length === 0) {
            addressListContainer.innerHTML = '<div class="alert alert-info mt-3">Bạn chưa có địa chỉ giao hàng nào. Hãy thêm một địa chỉ!</div>';
            return;
        }

        addressListContainer.innerHTML = addresses.map(formatAddress).join('');
        
    } catch (error) {
        addressListContainer.innerHTML = `<div class="alert alert-danger mt-3">Lỗi khi tải địa chỉ: ${error.message}</div>`;
    }
}

// --- Event Handlers ---

// Xử lý submit form Thêm/Sửa địa chỉ
addAddressForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('address-id-input').value);
    
    const addressData = {
        adrsID: id,
        receiverName: document.getElementById('inputReceiverName').value,
        receiverPhone: document.getElementById('inputReceiverPhone').value,
        city: document.getElementById('inputCity').value,
        ward: document.getElementById('inputWard').value,
        detailedAddress: document.getElementById('inputDetailedAddress').value,
        isDefault: document.getElementById('inputIsDefault').checked
    };

    saveAddressBtn.disabled = true;
    saveAddressBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Đang lưu...';

    try {
        if (id === 0) {
            // Thêm mới
            await addressService.addAddress(addressData);
            alert('Thêm địa chỉ thành công!');
        } else {
            // Cập nhật
            await addressService.updateAddress(id, addressData);
            alert('Cập nhật địa chỉ thành công!');
        }
        
        addAddressModal.hide();
        loadAddresses(); // Tải lại danh sách
    } catch (error) {
        alert(`Lỗi: ${error.message}`);
    } finally {
        saveAddressBtn.disabled = false;
        // Khôi phục lại nội dung button
        const isUpdate = id !== 0;
        saveAddressBtn.innerHTML = isUpdate 
            ? '<i class="bi bi-save me-2"></i> Lưu Thay Đổi' 
            : '<i class="bi bi-plus-circle me-2"></i> Lưu Địa chỉ';
    }
});

// Xử lý sự kiện modal đóng
addAddressModalEl.addEventListener('hidden.bs.modal', resetAddressForm);

// Xử lý sự kiện click trên các nút trong danh sách (Chỉnh sửa/Xóa)
addressListContainer.addEventListener('click', async (e) => {
    const target = e.target.closest('.edit-address-btn, .delete-address-btn');
    if (!target) return;

    const id = parseInt(target.dataset.id);

    if (target.classList.contains('edit-address-btn')) {
        // Xử lý Chỉnh sửa
        try {
            const address = await addressService.getAddressById(id);
            if (address) {
                // Điền dữ liệu vào form
                document.getElementById('address-id-input').value = address.adrsID;
                document.getElementById('inputReceiverName').value = address.receiverName;
                document.getElementById('inputReceiverPhone').value = address.receiverPhone;
                document.getElementById('inputCity').value = address.city;
                document.getElementById('inputWard').value = address.ward;
                document.getElementById('inputDetailedAddress').value = address.detailedAddress;
                document.getElementById('inputIsDefault').checked = address.isDefault;

                // Cập nhật modal title và button
                modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i> Chỉnh sửa Địa chỉ';
                saveAddressBtn.innerHTML = '<i class="bi bi-save me-2"></i> Lưu Thay Đổi';
                
                addAddressModal.show();
            }
        } catch (error) {
            alert(`Lỗi khi tải dữ liệu địa chỉ: ${error.message}`);
        }
    } else if (target.classList.contains('delete-address-btn')) {
        // Xử lý Xóa
        if (confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
            try {
                await addressService.deleteAddress(id);
                alert('Xóa địa chỉ thành công!');
                loadAddresses(); // Tải lại danh sách
            } catch (error) {
                alert(`Lỗi khi xóa địa chỉ: ${error.message}`);
            }
        }
    }
});

// Sự kiện khi tab Địa chỉ được hiển thị lần đầu (nếu cần load data)
const addressesTab = document.getElementById('addresses-tab');
addressesTab.addEventListener('show.bs.tab', loadAddresses, { once: true });

// Khi trang load, nếu tab đang active là Địa chỉ, thì load ngay
if (addressesTab.classList.contains('active')) {
    loadAddresses();
}