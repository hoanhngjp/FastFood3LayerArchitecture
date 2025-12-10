import { callApi } from './apiClient.js';
const ENDPOINT = '/foods';

// ----------------------------------------------------
// CÁC PHƯƠNG THỨC FOOD ITEM 
// ----------------------------------------------------

/**
 * [GET] Lấy tất cả món ăn
 * @param {number|null} categoryId - ID danh mục để lọc
 * @param {boolean|null} isSelling - Trạng thái: true/false/null
 * @param {string|null} search - Từ khóa tìm kiếm
 */
export const getFoods = (categoryId = null, isSelling = null, search = null) => {
    const params = new URLSearchParams();

    if (categoryId !== null) params.append('categoryId', categoryId);
    if (isSelling !== null) params.append('isSelling', isSelling);
    if (search && search.trim() !== '') params.append('search', search.trim());

    const queryString = params.toString() ? `?${params.toString()}` : '';

    // callApi tự động nối Base URL + Endpoint + QueryString
    // và tự động gửi Cookie (Token) đi kèm.
    return callApi(`${ENDPOINT}${queryString}`, null, 'GET');
};


export const getFoodDetail = (id) => {
    return callApi(`${ENDPOINT}/${id}`, null, 'GET');
};

/**
 * [POST] Tạo món ăn mới
 */
export const createFood = (foodData) => {
    return callApi(ENDPOINT, foodData, 'POST');
};

/**
 * [PUT] Cập nhật món ăn
 */
export const updateFood = (id, foodData) => {
    return callApi(`${ENDPOINT}/${id}`, foodData, 'PUT');
};

/**
 * [DELETE] Xóa món ăn
 */
export const deleteFood = (id) => {
    return callApi(`${ENDPOINT}/${id}`, null, 'DELETE');
};
