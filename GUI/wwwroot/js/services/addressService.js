import { callApi } from './apiClient.js';

// Base URL cho ME Controller
const ENDPOINT = '/me/addresses';

/**
 * [GET] Lấy danh sách địa chỉ
 */
export const getMyAddresses = () => {
    return callApi(ENDPOINT, null, 'GET');
};

/**
 * [POST] Thêm địa chỉ mới
 */
export const addAddress = (data) => {
    return callApi(ENDPOINT, data, 'POST');
};

/**
 * [PUT] Cập nhật địa chỉ
 */
export const updateAddress = (id, data) => {
    return callApi(`${ENDPOINT}/${id}`, data, 'PUT');
};

/**
 * [DELETE] Xóa địa chỉ
 */
export const deleteAddress = (id) => {
    return callApi(`${ENDPOINT}/${id}`, null, 'DELETE');
};