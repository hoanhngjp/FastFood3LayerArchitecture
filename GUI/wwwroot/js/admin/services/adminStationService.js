import { callApi } from '../../services/apiClient.js';
const ENDPOINT = '/api/admin/stations';
export const stationService = {
    getAll: () => callApi(ENDPOINT, null, 'GET'),
    getById: (id) => callApi(`${ENDPOINT}/${id}`, null, 'GET'),
    create: (data) => callApi(ENDPOINT, data, 'POST'),
    update: (id, data) => callApi(`${ENDPOINT}/${id}`, data, 'PUT'),
    delete: (id) => callApi(`${ENDPOINT}/${id}`, null, 'DELETE')
};