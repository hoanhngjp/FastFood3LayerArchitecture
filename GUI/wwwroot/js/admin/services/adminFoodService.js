import { callApi } from '../../services/apiClient.js';

const ENDPOINT = '/foods';

export const foodService = {
    // [GET] Lấy danh sách (có hỗ trợ lọc theo Category)
    // Nếu có categoryId thì nối query string
    getAll: (categoryId = null) => {
        let url = ENDPOINT;
        if (categoryId) {
            url += `?categoryId=${categoryId}`;
        }
        return callApi(url, null, 'GET');
    },

    // [GET] Lấy món ăn theo Category (tường minh hơn)
    getByCategory: (catId) => callApi(`${ENDPOINT}?categoryId=${catId}`, null, 'GET'),

    // [GET] Chi tiết
    getById: (id) => callApi(`${ENDPOINT}/${id}`, null, 'GET'),

    // [POST] Tạo mới
    create: (data) => callApi(ENDPOINT, data, 'POST'),

    // [PUT] Cập nhật
    update: (id, data) => callApi(`${ENDPOINT}/${id}`, data, 'PUT'),

    // [DELETE] Xóa
    delete: (id) => callApi(`${ENDPOINT}/${id}`, null, 'DELETE')
};