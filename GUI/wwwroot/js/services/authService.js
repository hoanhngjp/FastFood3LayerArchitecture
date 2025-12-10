import { callApi } from './apiClient.js';

const ENDPOINT = '/auth';

export const signup = (fullName, email, password, role = 'customer') => {
    return callApi(`${ENDPOINT}/signup`, { fullName, email, password, role }, 'POST');
};

export const login = (email, password) => {
    return callApi(`${ENDPOINT}/login`, { email, password }, 'POST');
};

export const logout = () => {
    return callApi(`${ENDPOINT}/logout`, null, 'POST');
};

/**
 * [GET] Lấy thông tin phiên làm việc
 * Trả về: Object UserInfo hoặc null (nếu chưa đăng nhập)
 */
export const getSession = async () => {
    try {
        const sessionInfo = await callApi(`${ENDPOINT}/session`, null, 'GET');
        return sessionInfo;
    } catch (error) {
        // Nếu lỗi là UNAUTHORIZED (401), nghĩa là khách chưa đăng nhập
        if (error.message === "UNAUTHORIZED") {
            // Trả về null thay vì ném lỗi, để UI hiển thị nút Login/Register
            return null;
        }
        // Các lỗi khác (500, mất mạng...) thì ném ra để xử lý
        throw error;
    }
};

export const refreshToken = () => {
    return callApi(`${ENDPOINT}/refresh`, null, 'POST');
};