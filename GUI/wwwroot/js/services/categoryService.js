import { callApi } from './apiClient.js';

// Định nghĩa Endpoint cho Category
const ENDPOINT = '/categories';

// ----------------------------------------------------
// CÁC PHƯƠNG THỨC CATEGORY
// ----------------------------------------------------

/**
 * [GET] Lấy tất cả danh mục (sử dụng cho bộ lọc)
 */
export const getCategories = () => {
    return callApi(ENDPOINT, null, 'GET');
};

/**
 * [GET] Lấy chi tiết danh mục
 * @param {number} id - ID danh mục
 */
export const getCategoryDetail = (id) => {
    return callApi(`${ENDPOINT}/${id}`, null, 'GET');
};