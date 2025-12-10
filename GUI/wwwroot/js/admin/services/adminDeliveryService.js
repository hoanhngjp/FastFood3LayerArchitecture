import { callApi } from '../../services/apiClient.js';

const ENDPOINT = '/api/admin/deliveries';

export const deliveryService = {
    getAll: () => callApi(ENDPOINT, null, 'GET'),
    getById: (id) => callApi(`${ENDPOINT}/${id}`, null, 'GET'),
    updateStatus: (id, statusId) => callApi(`${ENDPOINT}/status`, { DeliveryID: id, StatusID: statusId }, 'PUT')
};