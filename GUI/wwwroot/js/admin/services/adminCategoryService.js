// Import hàm gọi API chung (đi lùi 2 cấp để ra thư mục services gốc)
import { callApi } from '../../services/apiClient.js';

const ENDPOINT = '/categories';

export const categoryService = {
    // [GET] Lấy danh sách
    getAll: () => callApi(ENDPOINT, null, 'GET'),

    // [GET] Lấy chi tiết
    getById: (id) => callApi(`${ENDPOINT}/${id}`, null, 'GET'),

    // [POST] Tạo mới
    create: (data) => callApi(ENDPOINT, data, 'POST'),

    // [PUT] Cập nhật
    update: (id, data) => callApi(`${ENDPOINT}/${id}`, data, 'PUT'),

    // [DELETE] Xóa
    delete: (id) => callApi(`${ENDPOINT}/${id}`, null, 'DELETE')
};