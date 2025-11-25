/**
 * js/services/apiService.js
 * Hàm tiện ích để gọi API tập trung, xử lý lỗi, và chuyển hướng.
 */

// 🚨 CẦN THAY ĐỔI URL NÀY CHO ĐÚNG VỚI ĐỊA CHỈ BACKEND CỦA BẠN (VÍ DỤ 7104/5001)
const API_BASE_URL = 'https://localhost:7104/';

/**
 * Hàm gọi API chung.
 */
export async function apiFetch(endpoint, options = {}) {
    // Xử lý endpoint để tránh '//'
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${API_BASE_URL}${cleanEndpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    const config = {
        ...options,
        credentials: 'include', // Bắt buộc để gửi Cookie (token)
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    if (!config.body && config.method !== 'POST' && config.method !== 'PUT') {
        delete config.headers['Content-Type'];
    }

    try {
        const response = await fetch(url, config);

        if (response.status === 204) return null;

        // Kiểm tra Content-Type để tránh lỗi JSON SyntaxError
        const contentType = response.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        let data = {};
        if (isJson) {
            data = await response.json();
        } else if (!response.ok) {
            throw new Error(`Server Error: ${response.status} ${response.statusText} (Không phải JSON)`);
        } else {
            return {};
        }

        if (!response.ok) {
            let errorMessage = data.error || data.message || `Lỗi API: ${response.status} ${response.statusText}`;

            if (response.status === 401 || response.status === 403) {
                console.error("Lỗi xác thực. Đang chuyển hướng...");
                // Chuyển hướng người dùng về trang Đăng nhập khi token hết hạn
                window.location.href = '/Login';
            }
            throw data;
        }

        return data;

    } catch (error) {
        console.error(`API Call Failed (${endpoint}):`, error);
        throw error;
    }
}

export function apiGet(endpoint) {
    return apiFetch(endpoint, { method: 'GET' });
}

export function apiPost(endpoint, body) {
    return apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPut(endpoint, body) {
    return apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body) });
}

export function apiDelete(endpoint) {
    return apiFetch(endpoint, { method: 'DELETE' });
}