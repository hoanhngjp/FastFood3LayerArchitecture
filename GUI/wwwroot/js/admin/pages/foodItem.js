// Import các service dành riêng cho Admin (đã tạo ở bước trước)
import { foodService } from '../services/adminFoodService.js';
import { categoryService } from '../services/adminCategoryService.js';
import { uploadService } from '../services/uploadService.js';

// --- DOM ELEMENTS ---
const dom = {
    tableBody: document.getElementById('foodTableBody'),
    searchInput: document.getElementById('searchKeyword'),
    filterCategory: document.getElementById('filterCategory'),
    paginationInfo: document.getElementById('pagingInfo'),
    paginationControls: document.getElementById('paginationControls'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    // Modal Form Elements
    modal: new bootstrap.Modal(document.getElementById('foodModal')),
    form: document.getElementById('foodForm'),
    modalTitle: document.getElementById('foodModalTitle'),
    // Inputs
    inpId: document.getElementById('foodId'),
    inpName: document.getElementById('foodName'),
    inpCategory: document.getElementById('foodCategory'),
    inpPrice: document.getElementById('foodPrice'),
    inpStatus: document.getElementById('foodStatus'),
    inpDesc: document.getElementById('foodDesc'),
    inpImgUrl: document.getElementById('foodImgUrl'),
    inpFile: document.getElementById('foodImageFile'),
    imgPreview: document.getElementById('foodPreviewImg')
};

// --- STATE (Quản lý dữ liệu Client-side) ---
let state = {
    rawFoods: [],       // Toàn bộ dữ liệu từ API
    processedFoods: [], // Dữ liệu sau khi lọc/tìm kiếm
    currentPage: 1,
    pageSize: 10         // Mặc định 5 món/trang
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    await loadFoods();
    setupEventListeners();
});

function setupEventListeners() {
    // Sự kiện tìm kiếm (Debounce nhẹ nếu muốn, ở đây làm simple change)
    dom.searchInput.addEventListener('input', () => {
        state.currentPage = 1; // Reset về trang 1 khi tìm kiếm
        processData();
    });

    // Sự kiện lọc danh mục
    dom.filterCategory.addEventListener('change', () => {
        state.currentPage = 1;
        processData();
    });

    // Sự kiện thay đổi số lượng hiển thị
    dom.pageSizeSelect.addEventListener('change', (e) => {
        // 1. Cập nhật state pageSize
        state.pageSize = parseInt(e.target.value);

        // 2. Reset về trang 1 (để tránh lỗi đang ở trang 10 mà chỉnh size to lên thì mất trang 10)
        state.currentPage = 1;

        // 3. Render lại bảng (dùng hàm renderTable để cắt data lại)
        renderTable();
    });
}

// --- DATA LOADING ---

// 1. Load Categories cho Dropdown Lọc & Modal
async function loadCategories() {
    try {
        const categories = await categoryService.getAll();

        // Render vào Filter (Ngoài bảng)
        dom.filterCategory.innerHTML = '<option value="">-- Tất cả danh mục --</option>';

        // Render vào Modal (Trong form)
        dom.inpCategory.innerHTML = '<option value="">-- Chọn danh mục --</option>';

        categories.forEach(cat => {
            const optFilter = `<option value="${cat.categoryId}">${cat.name}</option>`;
            const optModal = `<option value="${cat.categoryId}">${cat.name}</option>`;

            dom.filterCategory.insertAdjacentHTML('beforeend', optFilter);
            dom.inpCategory.insertAdjacentHTML('beforeend', optModal);
        });
    } catch (e) {
        console.error("Lỗi load categories:", e);
    }
}

// 2. Load All Foods (Lấy hết 1 lần)
window.loadFoods = async () => {
    try {
        // Gọi API lấy TẤT CẢ (không phân trang ở server)
        const data = await foodService.getAll();
        state.rawFoods = data || [];

        // Xử lý lọc & phân trang client
        processData();

    } catch (e) {
        console.error("Lỗi load foods:", e);
        dom.tableBody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Lỗi tải dữ liệu</td></tr>`;
    }
};

// --- LOGIC CLIENT-SIDE PAGINATION ---

// Bước 1: Lọc dữ liệu (Search + Filter Category)
function processData() {
    const keyword = dom.searchInput.value.toLowerCase().trim();
    const catId = dom.filterCategory.value;

    state.processedFoods = state.rawFoods.filter(item => {
        // Lọc theo tên
        const matchName = (item.foodName || '').toLowerCase().includes(keyword);
        // Lọc theo category (nếu có chọn)
        const matchCat = catId ? item.categoryId == catId : true;

        return matchName && matchCat;
    });

    // Check bound trang hiện tại
    const totalPages = Math.ceil(state.processedFoods.length / state.pageSize);
    if (state.currentPage > totalPages) state.currentPage = 1 || 1;

    renderTable();
}

// Bước 2: Cắt mảng (Slice) & Render
function renderTable() {
    const totalItems = state.processedFoods.length;
    const totalPages = Math.ceil(totalItems / state.pageSize);

    // Tính index cắt mảng
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalItems);

    // Cắt dữ liệu cho trang hiện tại
    const pageData = state.processedFoods.slice(startIndex, endIndex);

    // Render Rows
    dom.tableBody.innerHTML = '';

    if (totalItems === 0) {
        dom.tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Không có dữ liệu</td></tr>';
        renderPagination(0, 0);
        return;
    }

    pageData.forEach(item => {
        // Badge trạng thái
        let badgeInfo = { class: 'bg-success', text: 'Đang bán' };
        if (item.statusID === 0) badgeInfo = { class: 'bg-secondary', text: 'Ngừng bán' };
        if (item.statusID === 2) badgeInfo = { class: 'bg-warning text-dark', text: 'Hết hàng' }; // Ví dụ

        const row = `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <img src="${item.imgUrl || '/images/default.png'}" class="rounded me-3 border" 
                             style="width: 45px; height: 45px; object-fit: cover;" 
                             onerror="this.src='https://placehold.co/45x45'">
                        <div>
                            <div class="fw-bold text-dark">${item.foodName}</div>
                            <small class="text-muted">ID: ${item.foodId}</small>
                        </div>
                    </div>
                </td>
                <td class="fw-bold text-primary">${item.price.toLocaleString()} đ</td>
                <td><span class="badge bg-light text-dark border">${item.categoryName || 'Chưa phân loại'}</span></td>
                <td><span class="badge ${badgeInfo.class}">${item.statusName || badgeInfo.text}</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="window.editFood(${item.foodId})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.deleteFood(${item.foodId})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        dom.tableBody.insertAdjacentHTML('beforeend', row);
    });

    renderPagination(totalItems, totalPages, startIndex, endIndex);
}

// Bước 3: Render nút phân trang
function renderPagination(totalItems, totalPages, startIndex, endIndex) {
    // Info Text
    if (totalItems > 0) {
        dom.paginationInfo.innerText = `Hiển thị ${startIndex + 1} - ${endIndex} của ${totalItems} món`;
    } else {
        dom.paginationInfo.innerText = 'Chưa có dữ liệu';
    }

    // Controls
    const ul = dom.paginationControls;
    ul.innerHTML = '';

    if (totalPages <= 1) return;

    // Helper tạo nút
    const createLi = (text, page, isActive = false, isDisabled = false) => {
        return `
            <li class="page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}">
                <button class="page-link" onclick="window.changePage(${page})">${text}</button>
            </li>
        `;
    };

    // Prev
    ul.insertAdjacentHTML('beforeend', createLi('Trước', state.currentPage - 1, false, state.currentPage === 1));

    // Pages (Logic đơn giản: hiện hết, bạn có thể copy logic "..." từ manager.js sang nếu muốn)
    for (let i = 1; i <= totalPages; i++) {
        ul.insertAdjacentHTML('beforeend', createLi(i, i, i === state.currentPage));
    }

    // Next
    ul.insertAdjacentHTML('beforeend', createLi('Sau', state.currentPage + 1, false, state.currentPage === totalPages));
}

// Hàm đổi trang (gắn vào window)
window.changePage = (page) => {
    if (page < 1) return;
    state.currentPage = page;
    renderTable(); // Chỉ cần render lại, không cần gọi API
};


// --- CRUD OPERATIONS (ADMIN ONLY) ---

window.openFoodModal = () => {
    dom.form.reset();
    dom.inpId.value = '';
    dom.inpImgUrl.value = '';
    dom.imgPreview.style.display = 'none';
    dom.modalTitle.innerText = 'Thêm món ăn mới';
    dom.inpStatus.value = "1"; // Default active
    dom.modal.show();
};

window.editFood = async (id) => {
    try {
        const item = await foodService.getById(id);
        if (!item) return;

        dom.inpId.value = item.foodId;
        dom.inpName.value = item.foodName;
        dom.inpPrice.value = item.price;
        dom.inpCategory.value = item.categoryId;
        dom.inpStatus.value = item.statusID;
        dom.inpDesc.value = item.description || '';
        dom.inpImgUrl.value = item.imgUrl || '';

        if (item.imgUrl) {
            dom.imgPreview.src = item.imgUrl;
            dom.imgPreview.style.display = 'block';
        } else {
            dom.imgPreview.style.display = 'none';
        }

        dom.modalTitle.innerText = 'Cập nhật món ăn';
        dom.modal.show();
    } catch (e) {
        alert("Lỗi lấy thông tin món");
    }
};

window.saveFood = async () => {
    // Validation đơn giản
    if (!dom.inpName.value || !dom.inpPrice.value || !dom.inpCategory.value) {
        alert("Vui lòng nhập tên, giá và danh mục!");
        return;
    }

    try {
        // 1. Upload ảnh (nếu có file mới)
        let currentImgUrl = dom.inpImgUrl.value;
        if (dom.inpFile.files.length > 0) {
            currentImgUrl = await uploadService.uploadImage(dom.inpFile.files[0]);
        }

        // 2. Prepare Payload
        const payload = {
            FoodName: dom.inpName.value,
            Description: dom.inpDesc.value,
            Price: parseInt(dom.inpPrice.value),
            StatusID: parseInt(dom.inpStatus.value),
            CategoryId: parseInt(dom.inpCategory.value),
            ImgUrl: currentImgUrl
        };

        const id = dom.inpId.value;

        // 3. Call API
        if (id) {
            payload.FoodId = parseInt(id);
            await foodService.update(id, payload);
            alert("Cập nhật thành công!");
        } else {
            await foodService.create(payload);
            alert("Thêm mới thành công!");
        }

        dom.modal.hide();

        // 4. Reload Data (Quan trọng: Gọi lại API để lấy list mới nhất)
        await loadFoods();

    } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra: " + (err.message || err));
    }
};

window.deleteFood = async (id) => {
    if (confirm("Bạn có chắc muốn xóa món này?")) {
        try {
            await foodService.delete(id);
            // Refresh lại list
            await loadFoods();
        } catch (e) {
            alert("Xóa thất bại!");
        }
    }
};