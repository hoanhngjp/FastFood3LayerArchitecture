import { callApi } from '../../services/apiClient.js';

const ENDPOINT = '/api/admin/orders';

export const orderService = {
    getAll: () => callApi(ENDPOINT, null, 'GET'),
    getById: (id) => callApi(`${ENDPOINT}/${id}`, null, 'GET'),

    // API Update Status dành cho Admin
    updateStatus: (orderId, statusId) => callApi(`${ENDPOINT}/status`, { OrderID: orderId, StatusID: statusId }, 'PUT'),

    delete: (id) => callApi(`${ENDPOINT}/${id}`, null, 'DELETE')
};