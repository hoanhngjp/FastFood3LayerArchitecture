import { API_BASE_URL } from '../config.js'; // Đảm bảo file config.js tồn tại!

export async function callApi(endpoint, data = null, method = 'GET', isRetry = false) {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${path}`;

    const options = {
        method: method,
        credentials: 'include',
        headers: {
            // KHÔNG set mặc định Content-Type ở đây nữa
            // Chúng ta sẽ set ở logic bên dưới
        },
    };

    // --- LOGIC MỚI: Tự động phát hiện JSON hay FormData ---
    if (data) {
        if (data instanceof FormData) {
            // Nếu là Upload File
            options.body = data;
            // Lưu ý: KHÔNG ĐƯỢC set Content-Type thủ công khi dùng FormData
            // Trình duyệt sẽ tự thêm: Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
        } else {
            // Nếu là dữ liệu thường (JSON)
            options.body = JSON.stringify(data);
            options.headers['Content-Type'] = 'application/json';
        }
    }
    // ------------------------------------------------------

    try {
        const response = await fetch(url, options);

        // ... (Giữ nguyên logic xử lý 401 Refresh Token của bạn ở đây) ...
        if (response.status === 401) {
            if (!isRetry) {
                console.warn(`[Auto-Refresh] Token hết hạn tại ${endpoint}. Đang thử gia hạn...`);
                try {
                    await callApi('/auth/refresh', null, 'POST', true);
                    console.log("[Auto-Refresh] Gia hạn thành công! Gọi lại API cũ...");
                    return await callApi(endpoint, data, method, true);
                } catch (refreshError) {
                    throw new Error("UNAUTHORIZED");
                }
            } else {
                throw new Error("UNAUTHORIZED");
            }
        }

        // ... (Giữ nguyên logic xử lý response data) ...
        let responseData = {};
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            if (response.status !== 204) {
                responseData = await response.json();
            }
        }

        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || response.statusText || "Lỗi Server";
            throw new Error(errorMessage);
        }

        return responseData;

    } catch (error) {
        if (error.message !== "UNAUTHORIZED") {
            console.error(`API Error [${endpoint}]:`, error);
        }
        throw error;
    }
}