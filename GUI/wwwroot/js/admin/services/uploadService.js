import { callApi } from '../../services/apiClient.js';

// Endpoint của Upload Controller
const ENDPOINT = '/upload/image';

export const uploadService = {
    async uploadImage(file) {
        // 1. Tạo FormData
        const formData = new FormData();
        formData.append('file', file); // 'file' phải khớp với tên tham số trong Controller C# (IFormFile file)

        console.log("--- ĐANG GỬI UPLOAD ---");
        console.log("Filename:", file.name);
        console.log("Size:", file.size);
        // Cách log FormData chuẩn:
        for (var pair of formData.entries()) {
            console.log(pair[0] + ', ' + pair[1]);
        }

        // 2. Gọi API thông qua callApi (đã nâng cấp)
        // Kết quả trả về là Object { url: "/images/..." }
        const data = await callApi(ENDPOINT, formData, 'POST');

        // 3. Trả về đường dẫn ảnh
        return data.url;
    }
};