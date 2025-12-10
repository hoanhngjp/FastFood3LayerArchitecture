import { getFoods } from '../../services/foodService.js';
import { getCategories } from '../../services/categoryService.js'; // Import thêm service Category

// --- DOM ELEMENTS ---
const dom = {
    tableBody: document.getElementById('menu-table-body'),
    searchInput: document.getElementById('input-search'),
    categorySelect: document.getElementById('select-category'),
    pageSizeSelect: document.getElementById('select-page-size'),
    paginationArea: document.getElementById('pagination-area'),
    paginationControls: document.getElementById('pagination-controls'),
    paginationInfo: document.getElementById('pagination-info')
};

// --- STATE ---
let state = {
    rawFoods: [],       // Dữ liệu gốc từ API (theo Category đã chọn)
    processedFoods: [], // Dữ liệu sau khi tìm kiếm (Search Text)
    currentPage: 1,
    pageSize: 10
};

let searchTimeout = null;

// --- UTILS ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// --- MAIN FUNCTIONS ---

async function init() {
    // 1. Load Danh mục vào Select box
    await loadCategories();

    // 2. Load Món ăn ban đầu
    await loadFoods();

    // 3. Gắn sự kiện
    if (dom.searchInput) {
        dom.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(processDataAndRender, 300); // Debounce search text
        });
    }

    if (dom.categorySelect) {
        dom.categorySelect.addEventListener('change', () => {
            state.currentPage = 1;
            loadFoods(); // Gọi API lại khi đổi danh mục
        });
    }

    if (dom.pageSizeSelect) {
        dom.pageSizeSelect.addEventListener('change', (e) => {
            state.pageSize = parseInt(e.target.value);
            state.currentPage = 1;
            renderCurrentPage();
        });
    }
}

/**
 * Gọi API lấy danh sách Category và render vào <select>
 */
async function loadCategories() {
    try {
        const categories = await getCategories();
        if (categories && dom.categorySelect) {
            // Giữ lại option mặc định "Tất cả"
            dom.categorySelect.innerHTML = '<option value="" selected>-- Tất cả danh mục --</option>';

            categories.forEach(cat => {
                // Kiểm tra thuộc tính API trả về (categoryId hay CategoryId)
                const id = cat.categoryId || cat.CategoryId;
                const name = cat.name || cat.Name;

                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                dom.categorySelect.appendChild(option);
            });
        }
    } catch (e) {
        console.error("Lỗi tải danh mục:", e);
    }
}

/**
 * Gọi API lấy món ăn (Có lọc theo CategoryId nếu user chọn)
 */
async function loadFoods() {
    try {
        if (dom.tableBody) dom.tableBody.style.opacity = '0.5';

        // Lấy categoryId từ select box
        const catId = dom.categorySelect.value || null;

        // Gọi API: getFoods(categoryId, isSelling, search)
        // Hiện tại API Search text chưa có, ta để null, chỉ truyền categoryId
        const data = await getFoods(catId, null, null);

        state.rawFoods = data || [];

        // Sau khi có dữ liệu mới, chạy logic tìm kiếm (nếu đang gõ) và phân trang
        processDataAndRender();

    } catch (e) {
        console.error("Lỗi tải món ăn:", e);
        if (dom.tableBody) dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-danger text-center">Lỗi kết nối: ${e.message}</td></tr>`;
    } finally {
        if (dom.tableBody) dom.tableBody.style.opacity = '1';
    }
}

/**
 * Xử lý logic Tìm kiếm (Client-side) và chuẩn bị dữ liệu để phân trang
 */
function processDataAndRender() {
    const keyword = dom.searchInput ? dom.searchInput.value.toLowerCase().trim() : '';

    if (!keyword) {
        state.processedFoods = [...state.rawFoods];
    } else {
        // Lọc Client-side vì API chưa hỗ trợ search text
        state.processedFoods = state.rawFoods.filter(item => {
            const name = item.name || item.Name || '';
            return name.toLowerCase().includes(keyword);
        });
    }

    // Reset về trang 1 nếu kết quả tìm kiếm ít hơn trang hiện tại
    const totalPages = Math.ceil(state.processedFoods.length / state.pageSize);
    if (state.currentPage > totalPages) state.currentPage = 1;

    renderCurrentPage();
}

/**
 * Cắt dữ liệu (Slice) và hiển thị
 */
function renderCurrentPage() {
    const totalItems = state.processedFoods.length;

    // Ẩn hiện khu vực phân trang
    if (dom.paginationArea) {
        dom.paginationArea.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    if (totalItems === 0) {
        dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5">Không tìm thấy món ăn nào.</td></tr>`;
        return;
    }

    // Tính toán Slice
    const totalPages = Math.ceil(totalItems / state.pageSize);
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalItems);

    const pageData = state.processedFoods.slice(startIndex, endIndex);

    // Render Bảng
    renderTableRows(pageData);

    // Render Nút phân trang
    renderPaginationControls(totalPages, totalItems, startIndex, endIndex);
}

function renderTableRows(foods) {
    dom.tableBody.innerHTML = '';
    foods.forEach(item => {
        // Map data linh hoạt (camelCase hoặc PascalCase)
        const id = item.foodId;
        const name = item.foodName;
        const imgUrl = item.imgUrl || "https://placehold.co/60x60?text=No+Img";
        const price = item.price || 0;
        const desc = item.description || "";

        // Xử lý status
        // API có thể trả về IsSelling (bool) hoặc Status (enum) tùy DTO của bạn
        // Ở đây check an toàn
        const isSelling = (item.isSelling !== undefined) ? item.isSelling : item.IsSelling;
        if (item.statusName = "Available") {
            var statusBadge = `<span class="badge bg-success bg-opacity-10 text-success rounded-pill">Đang bán</span>`

        }
        else {
            var statusBadge = `<span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">Ngừng bán</span>`;

        }
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="ps-4 text-muted">#${id}</td>
            <td><img src="${imgUrl}" class="rounded border" style="width: 60px; height: 60px; object-fit: cover;" onerror="this.src='https://placehold.co/60x60?text=No+Img'"></td>
            <td><span class="fw-bold text-dark">${name}</span></td>
            <td><span class="text-primary fw-bold">${formatCurrency(price)}</span></td>
            <td><span class="text-muted small text-truncate d-inline-block" style="max-width: 200px;">${desc}</span></td>
            <td class="text-center">${statusBadge}</td>
        `;
        dom.tableBody.appendChild(row);
    });
}

function renderPaginationControls(totalPages, totalItems, startIndex, endIndex) {
    // 1. Info Text
    if (dom.paginationInfo) {
        dom.paginationInfo.innerText = `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${totalItems} món`;
    }

    // 2. Controls
    if (!dom.paginationControls) return;
    dom.paginationControls.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous
    const createBtn = (label, page, disabled = false, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${disabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        li.innerHTML = `<button class="page-link">${label}</button>`;
        if (!disabled) {
            li.onclick = () => {
                state.currentPage = page;
                renderCurrentPage();
            };
        }
        return li;
    };

    dom.paginationControls.appendChild(createBtn('&laquo;', state.currentPage - 1, state.currentPage === 1));

    // Page Numbers (Rút gọn nếu quá nhiều trang)
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, state.currentPage + 2);

    // Luôn hiện trang 1
    if (startPage > 1) {
        dom.paginationControls.appendChild(createBtn('1', 1));
        if (startPage > 2) dom.paginationControls.appendChild(createBtn('...', state.currentPage, true));
    }

    for (let i = startPage; i <= endPage; i++) {
        dom.paginationControls.appendChild(createBtn(i, i, false, i === state.currentPage));
    }

    // Luôn hiện trang cuối
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) dom.paginationControls.appendChild(createBtn('...', state.currentPage, true));
        dom.paginationControls.appendChild(createBtn(totalPages, totalPages));
    }

    // Next
    dom.paginationControls.appendChild(createBtn('&raquo;', state.currentPage + 1, state.currentPage === totalPages));
}

// Init
document.addEventListener('DOMContentLoaded', init);