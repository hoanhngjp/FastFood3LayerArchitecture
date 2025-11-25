const AUTH_BASE_URL = 'https://localhost:7104/auth';
// Bỏ TOKEN_KEY và các hàm get/removeLocalToken vì ta dùng Cookie

/**
 * Hàm chung để gọi API Auth (POST, GET, etc.)
 * SỬ DỤNG CREDENTIALS: 'include' ĐỂ GỬI COOKIE
 * @param {string} endpoint - Ví dụ: '/signup', '/login', '/logout'
 * @param {object | null} data - Dữ liệu body.
 * @param {string} method - Phương thức HTTP (mặc định: 'POST').
 * @returns {Promise<any>}
 */
async function authApiCall(endpoint, data = null, method = 'POST') {
    const url = `${AUTH_BASE_URL}${endpoint}`;

    const options = {
        method: method,
        // *** ĐIỂM SỬA QUAN TRỌNG NHẤT ***
        // Bắt buộc phải thêm để trình duyệt gửi cookie (access_token) đến Server.
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            // Bỏ Authorization Header vì token nằm trong cookie
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
            // Lỗi khi parse JSON (có thể xảy ra với 204 NoContent)
        }

        if (!response.ok) {
            // Xử lý lỗi 401 Unauthorized
            if (response.status === 401) {
                // Không cần xóa token cục bộ vì nó nằm trong HttpOnly Cookie
                throw new Error("Phiên đăng nhập hết hạn hoặc không hợp lệ.");
            }

            const errorMessage = responseData.error || responseData.message || response.statusText || "Lỗi kết nối server";
            throw new Error(errorMessage);
        }

        return responseData;

    } catch (error) {
        console.error(`Lỗi API ${endpoint}:`, error);
        throw error;
    }
}

// ----------------------------------------------------
// CÁC PHƯƠNG THỨC XÁC THỰC EXPORT
// ----------------------------------------------------

/**
 * [POST] Đăng ký tài khoản mới (/auth/signup)
 */
export const signup = (fullName, email, password, role = 'customer') => {
    return authApiCall('/signup', { fullName, email, password, role });
};

/**
 * [POST] Đăng nhập (/auth/login)
 * Server sẽ tự thiết lập HttpOnly Cookies khi thành công (Backend đã làm)
 */
export const login = async (email, password) => {
    // API call sẽ nhận lại Cookie access_token và refresh_token qua header
    const responseData = await authApiCall('/login', { email, password });
    // Không cần lưu token vào Local Storage nữa!
    return responseData;
};

/**
 * [POST] Đăng xuất (/auth/logout)
 * Server sẽ xóa cookie (Backend đã làm)
 */
export const logout = async () => {
    // Gọi API để server xóa cookie
    const result = await authApiCall('/logout', null);
    // Không cần xóa token cục bộ
    return result;
};

/**
 * [GET] Kiểm tra trạng thái phiên làm việc (/auth/session)
 * Cookie access_token sẽ được gửi tự động (do credentials: 'include')
 */
export const getSession = async () => {
    try {
        // Nếu API trả về 200, userInfo hợp lệ. Nếu 401, nó sẽ ném lỗi.
        return await authApiCall('/session', null, 'GET');
    } catch (error) {
        // Xử lý lỗi 401 (hoặc lỗi khác)
        if (error.message.includes("Phiên đăng nhập hết hạn")) {
            return null; // Trả về null nếu chưa đăng nhập/hết hạn
        }
        // Các lỗi nghiêm trọng khác (500) vẫn ném ra
        throw error;
    }
};

/**
 * [POST] Làm mới token (/auth/refresh)
 * Cookie refresh_token (path=/auth) sẽ được gửi tự động.
 */
export const refreshToken = () => {
    // API này cần cookie refresh_token để tạo cookie access_token mới
    return authApiCall('/refresh', null);
};