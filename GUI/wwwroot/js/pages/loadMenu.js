import { getFoods } from '../services/foodService.js';
import { getCategories } from '../services/categoryService.js';

// 🛠️ THAM SỐ ID GIAO DIỆN (ĐÃ ĐIỀU CHỈNH ĐỂ KHẮC PHỤC LỖI NULL TRONG HTML SHOP)
const FOOD_CONTAINER_ID = 'food-container'; // ul.food-menu-list
const CATEGORY_CONTAINER_ID = 'category-filter-list'; // ul.filter-list (chứa các nút lọc)
const PAGINATION_CONTAINER_ID = 'food-pagination'; // ul.pagination
const FOOD_LOADING_ID = 'food-loading-area'; // li chứa loading
const ERROR_AREA_ID = 'food-error-message-area'; // div cảnh báo lỗi
// Các ID khác không dùng trên Trang Shop đã được loại bỏ

// BIẾN TRẠNG THÁI LỌC (GLOBAL STATE)
let currentCategoryId = null; 
let currentStatus = true; // Trang Shop thường chỉ hiển thị món 'Đang bán'
let currentSearchTerm = ''; // Giữ nguyên mặc dù không dùng search input trên shop


// --- HÀM HỖ TRỢ GIAO DIỆN ---
const formatCurrency = (amount) => {
    const value = parseFloat(amount || 0);
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0
    }).format(value);
};

// 🟢 HÀM XỬ LÝ GIAO DIỆN (Đã sửa lỗi NULL)
function showLoading() {
    const loadingArea = document.getElementById(FOOD_LOADING_ID);
    const container = document.getElementById(FOOD_CONTAINER_ID);
    const errorArea = document.getElementById(ERROR_AREA_ID);
    const paginationList = document.getElementById(PAGINATION_CONTAINER_ID);

    if (loadingArea) loadingArea.style.display = 'block';
    if (container) container.innerHTML = ''; 
    if (errorArea) errorArea.style.display = 'none';
    if (paginationList && paginationList.parentElement) {
        paginationList.parentElement.style.display = 'none';
    }
}

function hideLoading() {
    const loadingArea = document.getElementById(FOOD_LOADING_ID);
    if (loadingArea) loadingArea.style.display = 'none';
}

function showError(message) {
    const errorArea = document.getElementById(ERROR_AREA_ID);
    const container = document.getElementById(FOOD_CONTAINER_ID);

    if (errorArea) {
        errorArea.innerText = `Lỗi: ${message}`;
        errorArea.style.display = 'block';
    } else {
        console.error("Lỗi: Không tìm thấy phần tử hiển thị lỗi (ID: " + ERROR_AREA_ID + ")");
    }
    
    if (container) container.innerHTML = ''; 
    hideLoading();
}

// ⭐️ HÀM RENDER FOOD TABLE ĐÃ KHÔI PHỤC CẤU TRÚC CARD GỐC VÀ NÚT HOVER ⭐️
function renderFoodTable(foods) {
    const container = document.getElementById(FOOD_CONTAINER_ID);
    if (!container) return; 

    container.innerHTML = '';

    if (!foods || foods.length === 0) {
        container.innerHTML = `<li style="text-align: center; width: 100%; padding: 20px;" class="text-muted">Không tìm thấy món ăn nào.</li>`;
        return;
    }

    const foodHTMLArray = foods.map(food => {
        const foodId = food.foodId || 'N/A';
        const foodName = food.foodName || 'Unknown Dish';
        const categoryName = food.categoryName || 'Chung';
        const imageSrc = food.imgUrl || '/images/food-menu-default.png';
        const discount = food.discount || 0;

        // Tính toán Giá
        const finalPrice = formatCurrency(food.price || 0);
        let oldPrice = null;
        let badgeHTML = '';

        if (food.oldPrice && food.oldPrice > food.price) {
            oldPrice = formatCurrency(food.oldPrice);
        }

        if (discount > 0) {
            // Giả định bạn dùng class 'badge-tag' cho discount
            badgeHTML = `<div class="badge-tag">- ${discount}%</div>`; 
        } else if (oldPrice) {
             // Hoặc dùng cho sale
             badgeHTML = `<div class="badge-tag">Sale</div>`;
        }
        
        // Đường dẫn chi tiết sản phẩm (Sử dụng Query String)
        const detailUrl = `/Home/ProductDetail?foodId=${foodId}`;

        // CẤU TRÚC CARD GỐC
        return `
            <li>
                <div class="food-menu-card">
                    <div class="card-banner">
                        <img src="${imageSrc}" width="300" height="300" loading="lazy"
                            alt="${foodName}" class="w-100">
                        ${badgeHTML}
                        <a href="${detailUrl}" class="btn food-menu-btn">Order Now</a>
                    </div>
                    <div class="wrapper">
                        <p class="category">${categoryName}</p>
                        <div class="rating-wrapper">
                            <ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon><ion-icon name="star"></ion-icon>
                        </div>
                    </div>
                    <h3 class="h3 card-title"><a href="${detailUrl}" class="text-decoration-none">${foodName}</a></h3>
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

// 🟢 HÀM RENDER VÀ GẮN SỰ KIỆN LỌC (Dùng Button, đã sửa lỗi NULL)
function renderCategorySelects(categories) {
    const listContainer = document.getElementById(CATEGORY_CONTAINER_ID);
    
    if (!listContainer) {
        console.error("Lỗi: Không tìm thấy phần tử UL danh mục (ID: " + CATEGORY_CONTAINER_ID + ")");
        return;
    }

    listContainer.innerHTML = ''; 

    // Nút "Tất cả" (luôn ở đầu)
    const allButton = document.createElement('li');
    allButton.innerHTML = `<button class="filter-btn active" data-category-id="null">All</button>`;
    listContainer.appendChild(allButton);

    if (categories && categories.length > 0) {
        categories.forEach(cat => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<button class="filter-btn" data-category-id="${cat.categoryId}">${cat.name}</button>`;
            listContainer.appendChild(listItem);
        });
    }

    // Gắn sự kiện click cho các nút lọc sau khi đã render
    listContainer.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', handleCategoryFilter);
    });
}


function handleCategoryFilter(event) {
    const button = event.target;
    const newCategoryId = button.getAttribute('data-category-id') === 'null' 
                          ? null 
                          : parseInt(button.getAttribute('data-category-id'));
    
    currentCategoryId = newCategoryId;

    const container = document.getElementById(CATEGORY_CONTAINER_ID);
    if (container) {
        container.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    }

    loadFoodMenu();
}


// ------------------------------------------------------------------
// HÀM CHÍNH: TẢI DATA VÀ RENDER
// ------------------------------------------------------------------

async function loadFoodMenu() {
    const categoryId = currentCategoryId;
    const isSelling = currentStatus;
    const search = currentSearchTerm;

    showLoading();

    try {
        const result = await getFoods(categoryId, isSelling, search);
        const foods = result.data || result;

        console.log(`✅ Menu đã tải thành công. Số lượng món: ${foods.length}`);

        renderFoodTable(foods);

    } catch (error) {
        console.error(`❌ Lỗi tải menu:`, error);
        showError(`Lỗi tải món ăn: ${error.message || 'Lỗi kết nối hoặc phiên đăng nhập đã hết hạn (401).'}`);
    } finally {
        hideLoading(); 
    }
}


// ------------------------------------------------------------------
// KHỞI TẠO
// ------------------------------------------------------------------

function setupEventListeners() {
    // Không cần gắn sự kiện Lọc Trạng thái hay Tìm kiếm nếu đây là Trang Shop đơn giản
}

async function loadInitialData() {
    setupEventListeners();

    try {
        // Tải danh mục và render nút lọc
        const categories = await getCategories();
        renderCategorySelects(categories); 

        // Tải menu món ăn ban đầu
        loadFoodMenu();

    } catch (error) {
        console.error('❌ Lỗi tải dữ liệu ban đầu (Category):', error);
        showError(`Lỗi tải Danh mục: ${error.message || 'Lỗi kết nối hoặc API Category không phản hồi.'}`);
    }
}

// Chạy hàm khởi tạo
document.addEventListener('DOMContentLoaded', loadInitialData);