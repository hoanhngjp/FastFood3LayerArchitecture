import { callApi } from '../../services/apiClient.js';

const ENDPOINT = '/api/admin/drones';

export const droneService = {
    // Lấy tất cả Drone
    getAll: () => callApi(ENDPOINT, null, 'GET'),

    // Lấy chi tiết
    getById: (id) => callApi(`${ENDPOINT}/${id}`, null, 'GET'),

    // Lấy danh sách Trạm (để đổ vào Dropdown)
    getStations: () => callApi(`${ENDPOINT}/stations`, null, 'GET'),

    // Tạo mới
    create: (data) => callApi(ENDPOINT, data, 'POST'),

    // Cập nhật
    update: (id, data) => callApi(`${ENDPOINT}/${id}`, data, 'PUT'),

    // Xóa
    delete: (id) => callApi(`${ENDPOINT}/${id}`, null, 'DELETE')
};