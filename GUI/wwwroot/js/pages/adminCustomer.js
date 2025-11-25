import { getAllCustomers, deleteCustomer } from '../services/userService.js';

// --- CÁC PHẦN TỬ DOM CẦN THIẾT ---
const customerCountEl = document.getElementById('customer-count');
const customersTableBody = document.getElementById('customers-table-body');
const loadingAreaEl = document.getElementById('loading-area-customer');
const errorMessageAreaEl = document.getElementById('error-message-area-customer');
const deleteModalBodyEl = document.querySelector('#deleteCustomerModal .modal-body p');
const confirmDeleteBtn = document.querySelector('#deleteCustomerModal .btn-danger');

// --- HÀM TRỢ GIÚP ---

function getAdminToken() {
    return localStorage.getItem('adminAccessToken');
}

/**
 * Hàm chèn dữ liệu khách hàng vào bảng
 */
function renderCustomers(customers) {
    if (!customersTableBody) return;

    customersTableBody.innerHTML = '';

    if (customers.length === 0) {
        customersTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Không tìm thấy khách hàng nào.</td></tr>';
    }

    customers.forEach(customer => {
        const row = customersTableBody.insertRow();
        const totalOrders = customer.totalOrders || 0; // Giả sử API trả về totalOrders
        const points = customer.loyaltyPoints || 0;     // Giả sử API trả về loyaltyPoints
        const pointBadgeClass = points >= 1000 ? 'bg-success' : 'bg-secondary';

        row.insertCell().textContent = `C${customer.id}`; // Giả định ID là số
        row.insertCell().innerHTML = `<a href="#" class="text-decoration-none fw-bold">${customer.fullName || 'N/A'}</a>`;
        row.insertCell().textContent = customer.email || 'N/A';
        row.insertCell().textContent = customer.phoneNumber || 'N/A';
        row.insertCell().textContent = totalOrders;
        row.insertCell().innerHTML = `<span class="badge ${pointBadgeClass}">${points}</span>`;

        const actionCell = row.insertCell();
        actionCell.innerHTML = `
            <button class="btn btn-sm btn-outline-primary me-1 edit-customer-btn" data-user-id="${customer.id}" title="Chỉnh sửa"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-customer-btn" data-user-id="${customer.id}" data-user-name="${customer.fullName || 'N/A'}" title="Xóa" data-bs-toggle="modal" data-bs-target="#deleteCustomerModal"><i class="bi bi-trash"></i></button>
        `;
    });

    if (customerCountEl) {
        customerCountEl.textContent = customers.length;
    }

    attachDeleteModalEvents();
}

/**
 * Hàm tải dữ liệu khách hàng từ API
 */
async function loadCustomers() {
    const adminToken = getAdminToken();

    if (loadingAreaEl) loadingAreaEl.style.display = 'block';
    if (errorMessageAreaEl) errorMessageAreaEl.style.display = 'none';
    if (customersTableBody) customersTableBody.innerHTML = '';

    if (!adminToken) {
        if (loadingAreaEl) loadingAreaEl.style.display = 'none';
        if (errorMessageAreaEl) {
            errorMessageAreaEl.textContent = "Lỗi: Vui lòng đăng nhập với tài khoản Admin.";
            errorMessageAreaEl.style.display = 'block';
        }
        if (customerCountEl) customerCountEl.textContent = 'Lỗi';
        return;
    }

    try {
        const customers = await getAllCustomers(adminToken);

        if (loadingAreaEl) loadingAreaEl.style.display = 'none';

        renderCustomers(customers);
    } catch (error) {
        console.error("Lỗi khi tải Khách hàng:", error);

        if (loadingAreaEl) loadingAreaEl.style.display = 'none';
        if (errorMessageAreaEl) {
            errorMessageAreaEl.textContent = `Không thể tải dữ liệu khách hàng. Lỗi: ${error.message}.`;
            errorMessageAreaEl.style.display = 'block';
        }
        if (customerCountEl) customerCountEl.textContent = 'Lỗi';
    }
}


// --- XỬ LÝ SỰ KIỆN XÓA (Sử dụng Modal) ---

let userIdToDelete = null;

function attachDeleteModalEvents() {
    document.querySelectorAll('.delete-customer-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.userId;
            const userName = e.currentTarget.dataset.userName;
            userIdToDelete = userId;

            if (deleteModalBodyEl) {
                deleteModalBodyEl.innerHTML = `<p>Bạn có chắc chắn muốn xóa khách hàng <strong>${userName} (ID: ${userId})</strong> không? Thao tác này không thể hoàn tác.</p>`;
            }
        });
    });
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!userIdToDelete) return;

        const adminToken = getAdminToken();
        const userId = parseInt(userIdToDelete);

        // Cập nhật trạng thái nút
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = 'Đang xóa...';

        try {
            await deleteCustomer(userId, adminToken);
            alert(`Khách hàng ID ${userId} đã được xóa thành công.`);

            // Đóng Modal và tải lại danh sách
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteCustomerModal'));
            if (modal) modal.hide();

            loadCustomers();
        } catch (error) {
            alert(`Lỗi khi xóa khách hàng: ${error.message}`);
        } finally {
            // Đặt lại trạng thái nút và biến
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Xóa Vĩnh Viễn';
            userIdToDelete = null;
        }
    });
}

// Khởi chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', loadCustomers);