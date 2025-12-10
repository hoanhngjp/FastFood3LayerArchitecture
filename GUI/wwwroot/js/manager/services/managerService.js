import { callApi } from '../../services/apiClient.js';

const MANAGER_ENDPOINT = '/manager';

// --- DASHBOARD ---
export const getManagerStats = async (restaurantId, filter, fromDate = '', toDate = '') => {
    let url = `${MANAGER_ENDPOINT}/dashboard/statistics?restaurantId=${restaurantId}&filter=${filter}`;
    if (filter === 'custom' && fromDate && toDate) {
        url += `&from=${fromDate}&to=${toDate}`;
    }
    return await callApi(url, null, 'GET');
};
// --- QUẢN LÝ NHÀ HÀNG ---
// Lấy danh sách nhà hàng mà user này làm chủ (thường là 1)
export const getMyRestaurants = async () => {
    return await callApi(`${MANAGER_ENDPOINT}/my-restaurants`, null, 'GET');
};

export const updateRestaurantInfo = async (id, data) => {
    return await callApi(`${MANAGER_ENDPOINT}/restaurant/${id}/info`, data, 'PUT');
};

export const toggleRestaurantStatus = async (id, isOpen) => {
    return await callApi(`${MANAGER_ENDPOINT}/restaurant/${id}/toggle-status?isOpen=${isOpen}`, null, 'POST');
};

// --- QUẢN LÝ ĐƠN HÀNG (Order) ---
export const getRestaurantOrders = async (restaurantId, status = '') => {
    let url = `${MANAGER_ENDPOINT}/orders?restaurantId=${restaurantId}`;
    if (status) url += `&status=${status}`;
    return await callApi(url, null, 'GET');
};

export const confirmOrder = async (orderId) => {
    return await callApi(`${MANAGER_ENDPOINT}/orders/${orderId}/confirm`, null, 'POST');
};

export const cancelOrder = async (orderId) => {
    return await callApi(`${MANAGER_ENDPOINT}/orders/${orderId}/cancel`, null, 'POST');
};

export const getAvailableDrones = async () => {
    // Gọi API bạn vừa thêm vào RestaurantManagerController
    return await callApi(`${MANAGER_ENDPOINT}/drones/available`, null, 'GET');
};

export const assignDroneToOrder = async (orderId, droneId) => {
    const payload = { OrderId: parseInt(orderId), DroneId: parseInt(droneId) };
    return await callApi(`${MANAGER_ENDPOINT}/orders/assign-drone`, payload, 'POST');
};
export const getAllFoods = async () => {
    // Lưu ý: Nếu ManagerController chưa có endpoint này, bạn nên gọi API public 
    // hoặc thêm [HttpGet("foods")] vào Controller.
    // Ở đây mình ví dụ gọi API public:
    return await callApi(`/foods`, null, 'GET');
};