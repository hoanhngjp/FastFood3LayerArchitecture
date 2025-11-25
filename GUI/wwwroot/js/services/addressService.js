// /js/services/addressService.js (SỬA ĐỔI MỚI NHẤT DỰA TRÊN BE CÓ SẴN)

const ME_API_BASE_URL = 'https://localhost:7104/me';

/**
 * Hàm gọi API chung cho ME Controller (yêu cầu Cookie)
 */
async function meApiCall(endpoint = '', data = null, method = 'GET') {
    const url = `${ME_API_BASE_URL}${endpoint}`;

    const options = {
        method: method,
        credentials: 'include', // BẮT BUỘC để gửi access_token cookie
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (response.status === 401) {
        // Chuyển hướng khi phiên hết hạn
        window.location.href = '/Home/Login?redirect=' + encodeURIComponent(window.location.pathname);
        throw new Error("Phiên đăng nhập hết hạn hoặc không hợp lệ.");
    }

    if (response.status === 204) return null; // NoContent

    let responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
        let errorMessage = responseData.message || response.statusText || "Lỗi Server";

        // --- LOGIC XỬ LÝ LỖI MẶC ĐỊNH BadRequest(ModelState) TỪ BE ---

        // Kiểm tra nếu là lỗi 400 VÀ có đối tượng ModelState Errors (Key-Value Dictionary)
        if (response.status === 400 && responseData.errors && typeof responseData.errors === 'object') {

            // Lặp qua các trường lỗi trong ModelState Dictionary
            const errorDetails = Object.keys(responseData.errors).map(field => {
                const errors = responseData.errors[field];
                // errors là một mảng các chuỗi lỗi validation
                const errorMessages = Array.isArray(errors) ? errors.join(', ') : errors;
                return `[${field}]: ${errorMessages}`;
            }).join('\n');

            // Ghi đè thông báo lỗi để hiển thị chi tiết
            errorMessage = `Lỗi Validation: ${response.statusText}\nChi tiết:\n${errorDetails}`;
        }

        throw new Error(errorMessage);
    }

    return responseData;
}


// --- Address Service (Dùng chung ME Controller) ---

/**
 * [GET] /me/addresses - Lấy danh sách địa chỉ
 */
export const getMyAddresses = () => {
    return meApiCall('/addresses');
};

/**
 * [POST] /me/addresses - Thêm địa chỉ mới
 */
export const addAddress = (data) => {
    return meApiCall('/addresses', data, 'POST');
};

/**
 * [PUT] /me/addresses/{id} - Cập nhật địa chỉ
 */
export const updateAddress = (id, data) => {
    // data.AdrsID phải được set trong addressManager.js
    return meApiCall(`/addresses/${id}`, data, 'PUT');
};

/**
 * [DELETE] /me/addresses/{id} - Xóa địa chỉ
 */
export const deleteAddress = (id) => {
    return meApiCall(`/addresses/${id}`, null, 'DELETE');
};