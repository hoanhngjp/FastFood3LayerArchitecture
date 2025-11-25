// File: /js/services/userService.js

const ME_ENDPOINT = 'https://localhost:7104/me';

// ⭐️ Giả định: Token được lưu trong localStorage sau khi đăng nhập thành công.
const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    // Nếu API của bạn dùng Cookie/Session thay vì Bearer Token,
    // bạn cần loại bỏ dòng 'Authorization'. Hiện tại, giữ nguyên cấu trúc Bearer Token.
    if (!token) {
        console.warn("WARNING: Access token not found in localStorage. API call will likely fail with 401.");
        return { 'Content-Type': 'application/json' };
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
};

// ----------------------------------------------------
// PHẦN QUẢN LÝ ĐỊA CHỈ CÁ NHÂN (/me/addresses) - Đã có trong MeController.cs
// ----------------------------------------------------

/**
 * [GET] Lấy danh sách địa chỉ (/me/addresses)
 */
export async function getMyAddresses() {
    const response = await fetch(`${ME_ENDPOINT}/addresses`, { method: 'GET', headers: getAuthHeaders() });

    if (response.status === 401) throw new Error("Yêu cầu đăng nhập để xem địa chỉ.");
    if (!response.ok) throw new Error("Không thể tải địa chỉ.");

    return await response.json();
}

/**
 * [GET] Lấy địa chỉ theo ID (/me/addresses/{id})
 */
export async function getMyAddressById(id) {
    const response = await fetch(`${ME_ENDPOINT}/addresses/${id}`, { method: 'GET', headers: getAuthHeaders() });

    if (!response.ok) throw new Error("Không tìm thấy địa chỉ.");
    return await response.json();
}

/**
 * [POST] Thêm địa chỉ mới (/me/addresses)
 */
export async function addMyAddress(addressData) {
    const response = await fetch(`${ME_ENDPOINT}/addresses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(addressData)
    });
    if (response.status === 401) throw new Error("Yêu cầu đăng nhập.");
    if (!response.ok) throw new Error("Thêm địa chỉ thất bại.");

    return await response.json();
}

/**
 * [PUT] Cập nhật địa chỉ (/me/addresses/{id})
 */
export async function updateMyAddress(id, addressData) {
    const response = await fetch(`${ME_ENDPOINT}/addresses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(addressData)
    });
    if (response.status === 401) throw new Error("Yêu cầu đăng nhập.");
    if (!response.ok) throw new Error("Cập nhật địa chỉ thất bại.");

    return { success: true };
}

/**
 * [DELETE] Xóa địa chỉ (/me/addresses/{id})
 */
export async function deleteMyAddress(id) {
    const response = await fetch(`${ME_ENDPOINT}/addresses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (response.status === 401) throw new Error("Yêu cầu đăng nhập.");
    if (!response.ok) throw new Error("Xóa địa chỉ thất bại.");
}