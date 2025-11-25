const CATEGORY_BASE_URL = 'https://localhost:7104/categories';

/**
 * Hàm chung để gọi API cho Category (Sử dụng lại logic của apiCall nhưng với URL Category)
 * @param {string} endpoint - Ví dụ: '', '/1'
 * @param {string} method - 'GET', 'POST', 'PUT', 'DELETE'
 * @param {object} data - Dữ liệu gửi đi
 * @returns {Promise<any>}
 */
async function categoryApiCall(endpoint = '', method = 'GET', data = null) {
    const url = `${CATEGORY_BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Category API Error: ${response.status} - ${errorBody.message || 'Lỗi không xác định'}`);
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
// CÁC PHƯƠNG THỨC CATEGORY
// ----------------------------------------------------

/**
 * [GET] Lấy tất cả danh mục (sử dụng cho bộ lọc)
 */
export const getCategories = () => categoryApiCall('', 'GET');

/**
 * [GET] Lấy chi tiết danh mục
 * @param {number} id - ID danh mục
 */
export const getCategoryDetail = (id) => categoryApiCall(`/${id}`, 'GET');