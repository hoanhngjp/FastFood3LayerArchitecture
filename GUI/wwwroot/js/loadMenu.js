// File: wwwroot/js/loadMenu.js

// LƯU Ý: Đảm bảo foodService.js đã export hàm getFoods với 3 tham số (categoryId, pageSize, pageNumber)
import { getFoods } from './foodService.js';
import { getCategories } from './categoryService.js';

const API_BASE_URL = 'http://localhost:5278'; // Dùng cho đường dẫn tuyệt đối
const FOOD_CONTAINER_ID = 'food-container';
const CATEGORY_CONTAINER_ID = 'category-list-container';
const PAGINATION_CONTAINER_ID = 'food-pagination-list';
const PAGINATION_WRAPPER_ID = 'pagination-container'; // ID của div bọc phân trang

//BIẾN PHÂN TRANG MỚI 
const PAGE_SIZE = 6;
let currentPage = 1;
let currentCategoryId = null; // Cần dùng biến này để duy trì category khi chuyển trang

const LOADING_MESSAGE_CLASS = 'loading-message';

// Hàm format tiền tệ (Giữ nguyên)
const formatCurrency = (amount) => {
    // ... (Code formatCurrency giữ nguyên) ...
    const value = parseFloat(amount || 0);
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(value);
};


/**
 * Hàm vẽ giao diện món ăn
 * @param {Array<object>} foods - Mảng dữ liệu món ăn
 */
function renderFoodItems(foods) {
    const container = document.getElementById(FOOD_CONTAINER_ID);
    if (!container) return;

    // Xóa tất cả nội dung cũ (bao gồm thông báo loading)
    container.innerHTML = '';

    if (!foods || foods.length === 0) {
        container.innerHTML = '<li style="text-align: center; width: 100%; padding: 20px;">Không có món ăn nào.</li>';
        return;
    }

    const foodHTMLArray = foods.map(food => {
        const foodId = food.foodId || 0;
        const foodName = food.foodName || 'Unknown Dish';
        const imageRelativeUrl = food.imgUrl || '/images/food-menu-default.png';

        // ⚠️ Cập nhật đường dẫn ảnh: Thay vì nối BASE_URL ở đây,
        // chúng ta giả định imgUrl đã là đường dẫn tương đối từ gốc '/'
        // và View engine/browser sẽ xử lý, hoặc API đã trả về đúng URL
        const imageSrc = imageRelativeUrl.startsWith('/') ? imageRelativeUrl : `/${imageRelativeUrl}`;

        const finalPrice = formatCurrency(food.price || 0);
        const oldPrice = food.oldPrice ? formatCurrency(food.oldPrice) : null;
        const discountPercentage = food.discount || 0;

        const badgeHTML = discountPercentage > 0
            ? `<div class="badge">-${discountPercentage}%</div>`
            : '';

        const categoryName = food.categoryName || 'General';

        // Tạo cấu trúc HTML cho một món ăn
        return `
            <li>
                <div class="food-menu-card">
                    <div class="card-banner">
                        <img src="${imageSrc}" width="300" height="300" loading="lazy"
                            alt="${foodName}" class="w-100">
                        ${badgeHTML}
                        <a href="/Home/ProductDetail/${foodId}" class="btn food-menu-btn">Order Now</a>
                    </div>
                    <div class="wrapper">
                        <p class="category">${categoryName}</p>
                        <div class="rating-wrapper">
                            <ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon>
                        </div>
                    </div>
                    <h3 class="h3 card-title">${foodName}</h3>
                    <div class="price-wrapper">
                        <p class="price-text">Price:</p>
                        <data class="price" value="${food.price}">${finalPrice}</data>
                        ${oldPrice ? `<del class="del" value="${food.oldPrice}">${oldPrice}</del>` : ''}
                    </div>
                </div>
            </li>
        `;
    });

    container.innerHTML = foodHTMLArray.join('');
}


// ------------------------------------------------------------------
// HÀM RENDER PHÂN TRANG MỚI (CHUYỂN TỪ foodService.js)
// ------------------------------------------------------------------

/**
 * Tạo chuỗi HTML cho các nút phân trang và gán sự kiện.
 * @param {number} totalPages - Tổng số trang.
 * @param {number} page - Trang hiện tại.
 */
function renderPagination(totalPages, page) {
    const paginationList = document.getElementById(PAGINATION_CONTAINER_ID);
    const paginationWrapper = document.getElementById(PAGINATION_WRAPPER_ID);
    if (!paginationList || !paginationWrapper) return;

    if (totalPages <= 1) {
        paginationWrapper.style.display = 'none';
        return;
    }
    
    paginationList.innerHTML = '';
    let html = '';

    // Nút TRƯỚC
    html += `<li class="page-item ${page === 1 ? 'disabled' : ''}">
                <a class="page-link" data-page="${page - 1}" href="#" aria-label="Previous">Trước</a>
            </li>`;

    // Các nút số trang
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" data-page="${i}" href="#">${i}</a>
                </li>`;
    }

    // Nút SAU
    html += `<li class="page-item ${page === totalPages ? 'disabled' : ''}">
                <a class="page-link" data-page="${page + 1}" href="#" aria-label="Next">Sau</a>
            </li>`;

    paginationList.innerHTML = html;
    paginationWrapper.style.display = 'flex';

    // Gắn sự kiện click cho các nút phân trang
    paginationList.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const newPage = parseInt(e.target.dataset.page);
            if (newPage >= 1 && newPage <= totalPages) {
                // Tải lại dữ liệu với Category ID hiện tại và trang mới
                loadFoodMenu(currentCategoryId, newPage); 
            }
        });
    });
}


// ------------------------------------------------------------------
// HÀM RENDER CATEGORY VÀ LỌC (CẬP NHẬT LOGIC LỌC)
// ------------------------------------------------------------------

function renderCategoryButtons(categories) {
    const container = document.getElementById(CATEGORY_CONTAINER_ID);
    if (!container) return;

    // ... (Giữ nguyên logic tạo nút All và các nút Category khác) ...
    let buttonsHTML = '';

    // 1. Nút 'All' (Mặc định)
    buttonsHTML += `
        <li class="category-item">
            <button class="filter-btn active" data-id="all">All</button>
        </li>
    `;

    // 2. Các nút từ API
    const categoryItems = categories.map(cat => {
        return `
            <li class="category-item">
                <button class="filter-btn" data-id="${cat.categoryId}">${cat.name}</button>
            </li>
        `;
    });

    container.innerHTML = buttonsHTML + categoryItems.join('');

    // 3. Xử lý sự kiện click
    container.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const newId = event.target.dataset.id;

            // Cập nhật trạng thái active
            container.querySelector('.filter-btn.active')?.classList.remove('active');
            event.target.classList.add('active');

            // Cập nhật ID lọc
            const filterId = newId === 'all' ? null : parseInt(newId);
            
            // 🌟 CẬP NHẬT: Reset trang về 1 khi Category thay đổi 🌟
            loadFoodMenu(filterId, 1); 
        });
    });
}


// ------------------------------------------------------------------
// HÀM CHÍNH: TẢI DATA VÀ RENDER (CẬP NHẬT HỖ TRỢ PHÂN TRANG)
// ------------------------------------------------------------------

/**
 * Hàm tải món ăn theo Category (Cập nhật để nhận Category ID và Số trang)
 * @param {number|null} categoryId - ID danh mục cần lọc (null là All)
 * @param {number} [page=1] - Số trang cần tải.
 */
async function loadFoodMenu(categoryId, page = 1) {
    const container = document.getElementById(FOOD_CONTAINER_ID);
    const paginationWrapper = document.getElementById(PAGINATION_WRAPPER_ID);
    if (!container) return;
    
    // Cập nhật biến toàn cục
    currentCategoryId = categoryId;
    currentPage = page;

    // Hiển thị thông báo loading
    container.innerHTML = `<li class="${LOADING_MESSAGE_CLASS}" style="text-align: center; width: 100%; padding: 20px;">Đang tải dữ liệu món ăn...</li>`;
    if (paginationWrapper) paginationWrapper.style.display = 'none';

    try {
        // 🌟 GỌI SERVICE VỚI THAM SỐ PHÂN TRANG 🌟
        const result = await getFoods(categoryId, PAGE_SIZE, currentPage);
        
        // Giả định API trả về: { data: [foods...], totalItems: N, totalPages: M }
        const foods = result.data || result;
        const totalPages = result.totalPages || Math.ceil((result.totalItems || 0) / PAGE_SIZE);

        console.log(`✅ Menu đã tải thành công. Trang ${currentPage}/${totalPages} - Số lượng món: ${foods.length}`);

        // 1. Render danh sách món ăn
        renderFoodItems(foods);

        // 2. Render phân trang
        renderPagination(totalPages, currentPage);

    } catch (error) {
        console.error(`❌ Lỗi tải menu cho Category ${categoryId}, Trang ${page}:`, error);
        container.innerHTML = `<li style="text-align: center; width: 100%; padding: 20px; color: red;">Không thể tải dữ liệu: ${error.message}</li>`;
        if (paginationWrapper) paginationWrapper.style.display = 'none';
    }
}


/**
 * Hàm khởi tạo (Chạy 1 lần khi trang tải)
 */
async function loadInitialData() {
    try {
        // 1. Tải danh mục và render nút
        const categories = await getCategories();
        renderCategoryButtons(categories);

        // 2. Tải menu món ăn ban đầu (tất cả, trang 1)
        loadFoodMenu(null, 1); // Bắt đầu ở trang 1

    } catch (error) {
        console.error('❌ Lỗi tải dữ liệu ban đầu (Menu hoặc Category):', error);
        const foodContainer = document.getElementById(FOOD_CONTAINER_ID);
        if (foodContainer) {
            foodContainer.innerHTML = `<li style="text-align: center; width: 100%; padding: 20px; color: red;">Không thể tải dữ liệu ban đầu. Vui lòng kiểm tra API Category/Food.</li>`;
        }
    }
}

// Chạy hàm khởi tạo
document.addEventListener('DOMContentLoaded', loadInitialData);