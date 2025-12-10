import { getUsers, getAllRoles, createUser, updateUser, deleteUser } from '../services/userService.js';

// --- STATE ---
let state = {
    pageIndex: 1,
    pageSize: 10,
    totalCount: 0,
    roles: [] // Cache danh sách role để dùng lại
};

let userModal; // Bootstrap Instance

// --- DOM ELEMENTS ---
const dom = {
    tableBody: document.getElementById('users-table-body'),

    // Filters
    keyword: document.getElementById('filter-keyword'),
    roleFilter: document.getElementById('filter-role'),

    // Pagination
    pagInfo: document.getElementById('pagination-info'),
    pagControls: document.getElementById('pagination-controls'),

    // Modal Form
    modalEl: document.getElementById('userModal'),
    modalTitle: document.getElementById('modal-title'),
    form: document.getElementById('userForm'),
    inpId: document.getElementById('inp-id'),
    inpName: document.getElementById('inp-fullname'),
    inpEmail: document.getElementById('inp-email'),
    inpRole: document.getElementById('inp-role'),
    inpPass: document.getElementById('inp-password'),
    divPass: document.getElementById('div-password') // Để ẩn hiện hoặc đổi text gợi ý
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Init Modal
    if (window.bootstrap && dom.modalEl) {
        userModal = new window.bootstrap.Modal(dom.modalEl);
    }

    // 2. Load Roles vào Dropdown (Filter & Modal)
    await loadRoles();

    // 3. Load Danh sách User
    loadUsers();

    // 4. Sự kiện Enter khi tìm kiếm
    dom.keyword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUsers();
    });
});

// --- LOAD DATA ---

async function loadRoles() {
    try {
        const roles = await getAllRoles();
        state.roles = roles || [];

        // Fill Filter Dropdown
        if (dom.roleFilter) {
            state.roles.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.roleName; // Filter theo tên
                opt.textContent = r.roleName;
                dom.roleFilter.appendChild(opt);
            });
        }

        // Fill Modal Dropdown
        if (dom.inpRole) {
            dom.inpRole.innerHTML = ''; // Clear cũ
            state.roles.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.roleName; // API Create/Update đang nhận RoleName
                opt.textContent = r.roleName;
                dom.inpRole.appendChild(opt);
            });
        }

    } catch (e) {
        console.error("Lỗi tải Roles:", e);
    }
}

// Hàm này được gắn vào window để nút "Lọc" ở HTML gọi được
window.loadUsers = async (page = 1) => {
    state.pageIndex = page;

    if (dom.tableBody) {
        dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div> Đang tải...</td></tr>`;
    }

    const keyword = dom.keyword.value.trim();
    const role = dom.roleFilter.value;

    try {
        // Gọi API
        const data = await getUsers(keyword, role, state.pageIndex, state.pageSize);

        if (data) {
            state.totalCount = data.totalCount;
            renderTable(data.items);
            renderPagination(data.totalCount, data.pageIndex, data.pageSize);
        }
    } catch (e) {
        console.error(e);
        if (dom.tableBody) dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Lỗi: ${e.message}</td></tr>`;
    }
};

// --- RENDERING ---

function renderTable(users) {
    if (!dom.tableBody) return;
    dom.tableBody.innerHTML = '';

    if (!users || users.length === 0) {
        dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Không tìm thấy người dùng nào.</td></tr>`;
        return;
    }

    users.forEach(u => {
        // Map data an toàn
        const id = u.userID || u.UserID;
        const name = u.fullName || u.FullName || 'N/A';
        const email = u.email || u.Email || 'N/A';
        const role = u.roleName || u.RoleName || 'Customer';
        const created = formatDate(u.createdAt || u.CreatedAt);

        // Badge màu cho Role
        let roleBadge = 'bg-secondary';
        if (role.toLowerCase() === 'admin') roleBadge = 'bg-danger';
        else if (role.toLowerCase() === 'manager') roleBadge = 'bg-primary';
        else if (role.toLowerCase() === 'customer') roleBadge = 'bg-success';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 text-muted">#${id}</td>
            <td class="fw-bold">${name}</td>
            <td>${email}</td>
            <td><span class="badge ${roleBadge}">${role}</span></td>
            <td class="text-muted small">${created}</td>
            <td class="text-end pe-4">
                <button class="btn btn-sm btn-outline-primary me-1" 
                    data-id="${id}" 
                    data-name="${name}" 
                    data-email="${email}" 
                    data-role="${role}"
                    onclick="window.openUserModal(this)">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteUserItem(${id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        dom.tableBody.appendChild(tr);
    });
}

function renderPagination(totalCount, currentPage, pageSize) {
    if (!dom.pagControls || !dom.pagInfo) return;

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalCount);
    dom.pagInfo.innerText = totalCount > 0 ? `Hiển thị ${start}-${end} trên ${totalCount}` : 'Không có dữ liệu';

    const totalPages = Math.ceil(totalCount / pageSize);
    dom.pagControls.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous
    dom.pagControls.innerHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <button class="page-link" onclick="window.loadUsers(${currentPage - 1})">&laquo;</button>
        </li>
    `;

    // Page Numbers (Simple logic: Show all if < 7, else show window around current)
    // Để đơn giản, ở đây mình render tối đa 5 trang
    let minPage = Math.max(1, currentPage - 2);
    let maxPage = Math.min(totalPages, minPage + 4);

    for (let i = minPage; i <= maxPage; i++) {
        dom.pagControls.innerHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link" onclick="window.loadUsers(${i})">${i}</button>
            </li>
        `;
    }

    // Next
    dom.pagControls.innerHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <button class="page-link" onclick="window.loadUsers(${currentPage + 1})">&raquo;</button>
        </li>
    `;
}

// --- ACTIONS (Create / Edit / Delete) ---

// Mở Modal (Nếu có element truyền vào -> Edit, ngược lại -> Create)
window.openUserModal = (element = null) => {
    dom.form.reset(); // Xóa trắng form trước

    if (element) {
        // --- EDIT MODE ---
        dom.modalTitle.innerText = "Cập nhật thông tin";
        const ds = element.dataset;

        dom.inpId.value = ds.id;
        dom.inpName.value = ds.name;
        dom.inpEmail.value = ds.email;
        dom.inpRole.value = ds.role;

        // Khi Edit, password không bắt buộc
        dom.inpPass.placeholder = "Để trống nếu không đổi mật khẩu";
        dom.inpPass.required = false;
    } else {
        // --- CREATE MODE ---
        dom.modalTitle.innerText = "Thêm người dùng mới";
        dom.inpId.value = ""; // ID rỗng -> Create

        // Mặc định role Customer
        dom.inpRole.value = "Customer";

        dom.inpPass.placeholder = "Mặc định: 123456";
        dom.inpPass.required = false;
    }

    userModal.show();
};

window.saveUser = async () => {
    // Validate cơ bản
    if (!dom.form.checkValidity()) {
        dom.form.reportValidity();
        return;
    }

    const id = dom.inpId.value;
    const isEdit = !!id;

    // --- SỬA LẠI ĐOẠN NÀY ---
    // Phải viết hoa chữ cái đầu (PascalCase) để khớp với UserDTO trong C#
    const userData = {
        FullName: dom.inpName.value,
        Email: dom.inpEmail.value,
        RoleName: dom.inpRole.value,
        Password: dom.inpPass.value ? dom.inpPass.value : (isEdit ? null : "123456")
    };

    if (isEdit) {
        // QUAN TRỌNG: UserID phải viết hoa chữ U
        userData.UserID = parseInt(id);
    }
    // -------------------------

    const btnSave = document.querySelector('#userModal .btn-primary');
    const oldText = btnSave.innerText;
    btnSave.disabled = true;
    btnSave.innerText = "Đang lưu...";

    try {
        if (isEdit) {
            console.log("Dữ liệu gửi đi:", userData); // Bật F12 xem dòng này có UserID chưa
            await updateUser(id, userData);
            alert("Cập nhật thành công!");
        } else {
            await createUser(userData);
            alert("Thêm mới thành công! Mật khẩu mặc định: 123456");
        }

        userModal.hide();
        window.loadUsers(state.pageIndex);

    } catch (e) {
        // --- MẸO DEBUG ---
        // Nếu e.message chung chung, hãy vào Tab Network để xem chi tiết
        alert("Lỗi: " + e.message);
    } finally {
        btnSave.disabled = false;
        btnSave.innerText = oldText;
    }
};
window.deleteUserItem = async (id) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa người dùng #${id}? Hành động này không thể hoàn tác.`)) {
        return;
    }

    try {
        await deleteUser(id);
        alert("Đã xóa thành công.");
        loadUsers(state.pageIndex);
    } catch (e) {
        alert("Không thể xóa: " + e.message);
    }
};

// --- UTILS ---
const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
};