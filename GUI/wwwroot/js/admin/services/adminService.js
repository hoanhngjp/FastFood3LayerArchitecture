import { callApi } from '../../services/apiClient.js';

const ADMIN_ENDPOINT = '/admin';

// API 1: Lấy thống kê (thêm tham số restaurantId)
export const getSystemStats = async (restaurantId = 0, filter = 'today', fromDate = '', toDate = '') => {
    let url = `${ADMIN_ENDPOINT}/dashboard?restaurantId=${restaurantId}&filter=${filter}`;

    if (filter === 'custom' && fromDate && toDate) {
        url += `&from=${fromDate}&to=${toDate}`;
    }

    return await callApi(url, null, 'GET');
};

// API 2: Lấy danh sách nhà hàng cho dropdown
export const getAllRestaurantsList = async () => {
    return await callApi(`${ADMIN_ENDPOINT}/restaurants-list`, null, 'GET');
};