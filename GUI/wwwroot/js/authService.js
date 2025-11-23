const AUTH_BASE_URL = 'http://localhost:5123/auth';

/**
 * Hàm chung để gọi API Auth (POST)
 * @param {string} endpoint - Ví dụ: '/signup', '/login'
 * @param {object} data - Dữ liệu đăng ký/đăng nhập (fullName, email, password, role)
 * @returns {Promise<any>}
 */
async function authApiCall(endpoint, data) {
    const url = `${AUTH_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const responseData = await response.json();

        // **QUAN TRỌNG:** Giữ nguyên logic này. Khi Backend của bạn sửa lỗi,
        // nó sẽ trả về 201 Created và code sẽ chạy đúng.
        if (!response.ok) {
            // Lỗi từ Server (ví dụ: 400 Bad Request, 401 Unauthorized)
            throw new Error(responseData.message || `Lỗi API Auth: ${response.status}`);
        }

        // Nếu thành công (Code 200 OK)
        return responseData;

    } catch (error) {
        console.error(`Lỗi trong Auth API ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Hàm gọi API GET (chủ yếu dùng cho /session)
 * @param {string} endpoint - Ví dụ: '/session'
 * @returns {Promise<any>}
 */
async function authApiCallGet(endpoint) {
    const url = `${AUTH_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // Thêm headers cần thiết nếu bạn dùng Token
            },
        });

        if (response.status === 401) {
            return null; // Không xác thực (chưa đăng nhập)
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || `Lỗi GET API: ${response.status}`);
        }

        return responseData;

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
 * ĐÃ SỬA: Đổi giá trị mặc định của role từ 'user' sang 'User' để khớp với yêu cầu của Service.
 */
export const signup = (fullName, email, password, role = 'User') => {
    return authApiCall('/signup', { fullName, email, password, role });
};

/**
 * [POST] Đăng nhập (/auth/login)
 */
export const login = (email, password) => {
    return authApiCall('/login', { email, password });
};

/**
 * [POST] Đăng xuất (/auth/logout)
 */
export const logout = () => {
    // Logout thường là POST và không cần body
    return authApiCall('/logout', {});
};

/**
 * [GET] Kiểm tra trạng thái phiên làm việc (/auth/session)
 * Trả về thông tin người dùng nếu đã đăng nhập, hoặc null nếu chưa.
 */
export const getSession = () => {
    return authApiCallGet('/session');
};

/**
 * [POST] Làm mới token (/auth/refresh)
 * Thường dùng khi access token hết hạn (Sử dụng Refresh token trong cookies/local storage)
 */
export const refreshToken = () => {
    return authApiCall('/refresh', {});
};