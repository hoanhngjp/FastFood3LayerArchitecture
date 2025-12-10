import { callApi } from '../../services/apiClient.js';

const ENDPOINT = '/api/admin/restaurants'; // Lưu ý: Endpoint của Admin Controller

export const restaurantService = {
    // Hàm này lấy TOÀN BỘ dữ liệu
    getAll: () => callApi(ENDPOINT, null, 'GET'),

    getById: (id) => callApi(`${ENDPOINT}/${id}`, null, 'GET'),
    getManagers: () => callApi(`${ENDPOINT}/managers`, null, 'GET'),
    create: (data) => callApi(ENDPOINT, data, 'POST'),
    update: (id, data) => callApi(`${ENDPOINT}/${id}`, data, 'PUT'),
    delete: (id) => callApi(`${ENDPOINT}/${id}`, null, 'DELETE')
};