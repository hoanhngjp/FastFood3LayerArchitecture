// js/auth.js

import { apiPost, apiGet } from './services/apiService.js';

export async function login(email, password) {
    return await apiPost('auth/login', { email, password });
}

export async function signup(fullName, email, password) {
    return await apiPost('auth/signup', { fullName, email, password });
}

export async function getSessionInfo() {
    return apiGet('auth/session');
}

export async function logout() {
    return apiPost('auth/logout');
}