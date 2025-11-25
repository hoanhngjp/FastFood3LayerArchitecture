// foodService.js - Đã loại bỏ phân trang

const FOOD_BASE_URL = 'https://localhost:7104/foods'; // Hoặc đường dẫn API đúng
// Lưu ý: apiCall trong Admin cần có Token JWT, bạn cần thêm logic đó vào đây.

// --- Hàm chung apiCall (Đã thêm Authorization cho Admin) ---
async function apiCall(endpoint = '', method = 'GET', data = null) {
    const token = localStorage.getItem('token'); // Lấy token từ Local Storage
    const url = `${FOOD_BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            // Thêm Authorization Token
            ...(token && { 'Authorization': `Bearer ${token}` }),
        },
    };

    if (data && method !== 'GET' && method !== 'DELETE') {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            // Cố gắng đọc lỗi từ body nếu có
            let errorMessage = `API Error: ${response.status} - ${response.statusText}`;
            try {
                const errorBody = await response.json();
                errorMessage = errorBody.message || errorMessage;
            } catch {
                // Nếu không đọc được JSON, giữ lại thông báo lỗi HTTP
            }
            throw new Error(errorMessage);
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
// CÁC PHƯƠNG THỨC FOOD ITEM ĐÃ ĐƠN GIẢN HÓA
// ----------------------------------------------------

/**
 * [GET] Lấy tất cả món ăn (Chỉ hỗ trợ lọc theo category, trạng thái, và tìm kiếm)
 * @param {number|null} categoryId - ID danh mục để lọc
 * @param {boolean|null} isSelling - Trạng thái: true/false/null
 * @param {string|null} search - Từ khóa tìm kiếm
 */
export const getFoods = (categoryId = null, isSelling = null, search = null) => {
    const params = new URLSearchParams();

    // Thêm các tham số lọc vào query string
    if (categoryId !== null) {
        params.append('categoryId', categoryId);
    }
    if (isSelling !== null) {
        params.append('isSelling', isSelling); // API backend cần xử lý boolean này
    }
    if (search && search.trim() !== '') {
        params.append('search', search.trim());
    }

    // Nếu API Admin của bạn yêu cầu /api/FoodItem/admin
    // Bạn cần điều chỉnh FOOD_BASE_URL hoặc endpoint tại đây
    const endpoint = params.toString() ? `?${params.toString()}` : '';

    return apiCall(endpoint, 'GET');
};


// --- Các hàm CRUD khác giữ nguyên ---
export const getFoodDetail = (id) => apiCall(`/${id}`, 'GET');
export const createFood = (foodData) => apiCall('', 'POST', foodData);
export const updateFood = (id, foodData) => apiCall(`/${id}`, 'PUT', foodData);
export const deleteFood = (id) => apiCall(`/${id}`, 'DELETE');
