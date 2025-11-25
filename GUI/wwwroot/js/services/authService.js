// /js/services/authService.js
const AUTH_BASE_URL = 'https://localhost:7104/auth';

/**
 * Hàm chung để gọi API Auth (POST)
 * @param {string} endpoint - Ví dụ: '/signup', '/login', '/logout'
 * @param {object | null} data - Dữ liệu đăng ký/đăng nhập, hoặc null nếu không cần body.
 * @returns {Promise<any>}
 */
async function authApiCall(endpoint, data) {
    const url = `${AUTH_BASE_URL}${endpoint}`;

    const options = {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data !== null && data !== undefined) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);

        let responseData = {};
        try {
            if (response.status !== 204 && response.headers.get('content-type')?.includes('application/json')) {
                responseData = await response.json();
            }
        } catch (e) {
            // Lỗi khi parse JSON
        }

        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || response.statusText || "Lỗi kết nối server";
            throw new Error(errorMessage);
        }

        return responseData;

    } catch (error) {
        console.error(`Lỗi API ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Hàm gọi API GET (chủ yếu dùng cho /session)
 * @param {string} endpoint - Ví dụ: '/session'
 * @returns {Promise<any | null>}
 */
async function authApiCallGet(endpoint) {
    const url = `${AUTH_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 401) {
            return null; // Không xác thực (chưa đăng nhập)
        }

        if (!response.ok) {
            let responseData;
            try { responseData = await response.json(); } catch (e) { responseData = {}; }
            throw new Error(responseData.message || `Lỗi GET API: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error(`Lỗi trong Auth API GET ${endpoint}:`, error);
        return null;
    }
}


// ----------------------------------------------------
// CÁC PHƯƠNG THỨC XÁC THỰC
// ----------------------------------------------------

/**
 * [POST] Đăng ký tài khoản mới (/auth/signup)
 */
export const signup = (fullName, email, password, role = 'customer') => {
    return authApiCall('/signup', { fullName, email, password, role });
};

/**
 * [POST] Đăng nhập (/auth/login)
 */
export const login = async (email, password) => {
    const responseData = await authApiCall('/login', { email, password });

    // ⚠️ Nếu Server trả về accessToken trong body:
    if (responseData && responseData.accessToken) {
        localStorage.setItem('accessToken', responseData.accessToken);
    }

    return responseData;
};

/**
 * [POST] Đăng xuất (/auth/logout)
 */
export const logout = () => {
    return authApiCall('/logout', null);
};

/**
 * [GET] Kiểm tra trạng thái phiên làm việc (/auth/session)
 * Trả về thông tin người dùng nếu đã đăng nhập, hoặc null nếu chưa.
 */
export const getSession = async () => {
    const url = `${AUTH_BASE_URL}/session`;
    const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (response.ok) {
        return await response.json(); // Trả về SessionInfo
    }

    if (response.status === 401) {
        return null;
    }

    throw new Error(`Failed to load session: ${response.status}`);
};

/**
 * [POST] Làm mới token (/auth/refresh)
 */
export const refreshToken = () => {
    return authApiCall('/refresh', null);
};