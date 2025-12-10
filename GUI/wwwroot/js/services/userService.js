// File: /js/services/userService.js
import { callApi } from './apiClient.js';

// Endpoint gốc của MeController
const ME_ENDPOINT = '/me';

// ----------------------------------------------------
// QUẢN LÝ ĐỊA CHỈ (/me/addresses)
// ----------------------------------------------------

export async function getMyAddresses() {
    // callApi tự động xử lý Cookie và lỗi 401
    return await callApi(`${ME_ENDPOINT}/addresses`, null, 'GET');
}

export async function getMyAddressById(id) {
    return await callApi(`${ME_ENDPOINT}/addresses/${id}`, null, 'GET');
}

export async function addMyAddress(addressData) {
    return await callApi(`${ME_ENDPOINT}/addresses`, addressData, 'POST');
}

export async function updateMyAddress(id, addressData) {
    // API trả về 204 No Content nên callApi sẽ trả về {} hoặc null
    return await callApi(`${ME_ENDPOINT}/addresses/${id}`, addressData, 'PUT');
}

export async function deleteMyAddress(id) {
    return await callApi(`${ME_ENDPOINT}/addresses/${id}`, null, 'DELETE');
}

// ----------------------------------------------------
// QUẢN LÝ ĐƠN HÀNG (/me/orders)
// ----------------------------------------------------

export async function getMyOrders() {
    return await callApi(`${ME_ENDPOINT}/orders`, null, 'GET');
}