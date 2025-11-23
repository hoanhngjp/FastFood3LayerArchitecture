const BASE_URL = 'http://localhost:5123/foods';
const FOOD_CONTAINER_ID = 'food-container';
const PAGINATION_CONTAINER_ID = 'food-pagination-list';
const PAGE_SIZE = 6; // Kích thước trang cố định

// --- Hàm chung apiCall (Giữ nguyên) ---
async function apiCall(endpoint = '', method = 'GET', data = null) {
    // ... (Giữ nguyên code apiCall đã có) ...
    const url = `${BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            // Thường cần thêm Authorization Token ở đây nếu API yêu cầu
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API Error: ${response.status} - ${errorBody.message || 'Lỗi không xác định'}`);
        }

        if (response.status === 204 || method === 'DELETE') {
            return { success: true, message: "Thao tác thành công." };
        }

        return response.json();

    } catch (error) {
        console.error(`Lỗi trong ${method} ${url}:`, error);
        throw error;
    }
}


// ----------------------------------------------------
// CÁC PHƯƠNG THỨC FOOD ITEM VÀ LOGIC RENDER
// ----------------------------------------------------

/**
 * [GET] Lấy tất cả món ăn (Hỗ trợ lọc theo categoryId, Phân trang)
 * @param {number|null} categoryId - ID danh mục để lọc
 * @param {number|null} pageSize - Số lượng món ăn mỗi trang (Ví dụ: 6)
 * @param {number|null} pageNumber - Trang hiện tại (Ví dụ: 1)
 */
export const getFoods = (categoryId = null, pageSize = null, pageNumber = null) => {
    const params = new URLSearchParams();

    if (categoryId !== null) {
        params.append('categoryId', categoryId);
    }
    if (pageSize !== null) {
        params.append('pageSize', pageSize);
    }
    if (pageNumber !== null) {
        params.append('pageNumber', pageNumber);
    }

    const endpoint = params.toString() ? `?${params.toString()}` : '';

    return apiCall(endpoint, 'GET');
};


// ----------------------------------------------------
// CÁC HÀM HỖ TRỢ RENDER GIAO DIỆN MỚI
// ----------------------------------------------------

/**
 * Tạo chuỗi HTML cho một món ăn duy nhất.
 * @param {object} food - Dữ liệu món ăn.
 * @returns {string} Chuỗi HTML.
 */
const renderFoodItem = (food) => {
    // Giả sử food có các thuộc tính: id, name, price, imageUrl, rating
    // CHÚ Ý: Đảm bảo đường dẫn ảnh (food.imageUrl) là đường dẫn tuyệt đối bắt đầu bằng '/'
    const imageUrl = food.imageUrl && food.imageUrl.startsWith('/')
        ? food.imageUrl
        : `/${food.imageUrl}`; // Fix lỗi đường dẫn tương đối đã gặp

    return `
        <li>
            <div class="food-menu-card">

                <div class="card-banner">
                    <img src="${imageUrl}" width="300" height="300" loading="lazy"
                        alt="${food.name}" class="w-100">
                    <div class="badge">${food.categoryName || 'Món ăn'}</div>
                </div>

                <div class="wrapper">
                    <p class="category">${food.categoryName || 'Tổng hợp'}</p>
                    <div class="rating-wrapper">
                        ${'<ion-icon name="star"></ion-icon>'.repeat(food.rating || 5)}
                    </div>
                </div>

                <h3 class="h3 card-title">${food.name}</h3>

                <div class="price-wrapper">
                    <p class="price">${food.price.toLocaleString('vi-VN')} đ</p>
                    <button class="btn btn-primary">Thêm vào giỏ</button>
                </div>
            </div>
        </li>
    `;
};

/**
 * Tạo chuỗi HTML cho các nút phân trang.
 * @param {number} totalPages - Tổng số trang.
 * @param {number} currentPage - Trang hiện tại.
 * @returns {string} Chuỗi HTML của UL.
 */
const renderPagination = (totalPages, currentPage) => {
    let html = '';

    // Nút TRƯỚC
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" data-page="${currentPage - 1}" href="#" aria-label="Previous">Trước</a>
            </li>`;

    // Các nút số trang
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" data-page="${i}" href="#">${i}</a>
                </li>`;
    }

    // Nút SAU
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" data-page="${currentPage + 1}" href="#" aria-label="Next">Sau</a>
            </li>`;

    return html;
};

/**
 * Hàm chính để tải và hiển thị dữ liệu món ăn, bao gồm cả phân trang.
 * @param {number} [categoryId=null] - ID danh mục được chọn (nếu có).
 * @param {number} [pageNumber=1] - Số trang cần tải.
 */
export async function loadFoodData(categoryId = null, pageNumber = 1) {
    const foodContainer = document.getElementById(FOOD_CONTAINER_ID);
    const paginationList = document.getElementById(PAGINATION_CONTAINER_ID);
    const paginationWrapper = document.getElementById('pagination-container');
    const loadingSpinner = document.getElementById('loading-spinner');

    if (!foodContainer || !paginationList) return;

    // Hiển thị loading spinner và ẩn nội dung cũ
    foodContainer.innerHTML = loadingSpinner.outerHTML;
    paginationWrapper.style.display = 'none';

    try {
        const result = await getFoods(categoryId, PAGE_SIZE, pageNumber);

        // --- 1. Render danh sách món ăn ---
        const foods = result.data || result; // Tùy thuộc cấu trúc response API
        let foodHtml = '';

        if (foods && foods.length > 0) {
            foodHtml = foods.map(food => renderFoodItem(food)).join('');
        } else {
            foodHtml = '<li style="width: 100%; text-align: center;">Không tìm thấy món ăn nào.</li>';
        }

        foodContainer.innerHTML = foodHtml;


        // --- 2. Render phân trang ---
        // Giả sử API trả về totalPages, totalItems
        const totalPages = result.totalPages || Math.ceil((result.totalItems || 0) / PAGE_SIZE);

        if (totalPages > 1) {
            paginationList.innerHTML = renderPagination(totalPages, pageNumber);
            paginationWrapper.style.display = 'flex'; // Hiển thị phân trang

            // Gắn sự kiện click cho các nút phân trang
            paginationList.querySelectorAll('.page-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const newPage = parseInt(e.target.dataset.page);
                    if (newPage >= 1 && newPage <= totalPages) {
                        loadFoodData(categoryId, newPage); // Tải lại dữ liệu trang mới
                    }
                });
            });
        } else {
            paginationWrapper.style.display = 'none'; // Ẩn phân trang nếu chỉ có 1 trang
        }


    } catch (error) {
        foodContainer.innerHTML = '<li style="width: 100%; text-align: center; color: red;">Lỗi tải dữ liệu. Vui lòng thử lại.</li>';
        paginationWrapper.style.display = 'none';
        console.error("Lỗi khi tải dữ liệu món ăn:", error);
    }
}


// --- Các hàm CRUD khác giữ nguyên ---
export const getFoodDetail = (id) => apiCall(`/${id}`, 'GET');
export const createFood = (foodData) => apiCall('', 'POST', foodData);
export const updateFood = (id, foodData) => apiCall(`/${id}`, 'PUT', foodData);
export const deleteFood = (id) => apiCall(`/${id}`, 'DELETE');