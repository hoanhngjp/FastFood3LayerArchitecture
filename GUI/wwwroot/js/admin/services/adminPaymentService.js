import { callApi } from '../../services/apiClient.js';

const ENDPOINT = '/api/admin/payments';

export const paymentService = {
    getAll: () => callApi(ENDPOINT, null, 'GET')
};