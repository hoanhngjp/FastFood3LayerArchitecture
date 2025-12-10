import { callApi } from '../../services/apiClient.js';

const ENDPOINT = '/users';

export const getUsers = async (keyword = '', role = '', pageIndex = 1, pageSize = 10) => {
    const params = new URLSearchParams({
        keyword: keyword,
        role: role === 'All' ? '' : role,
        pageIndex: pageIndex,
        pageSize: pageSize
    });
    return await callApi(`${ENDPOINT}?${params}`, null, 'GET');
};

export const getAllRoles = async () => {
    return await callApi(`${ENDPOINT}/roles`, null, 'GET');
};

export const createUser = async (userData) => {
    return await callApi(ENDPOINT, userData, 'POST');
};

export const updateUser = async (id, userData) => {
    return await callApi(`${ENDPOINT}/${id}`, userData, 'PUT');
};

export const deleteUser = async (id) => {
    return await callApi(`${ENDPOINT}/${id}`, null, 'DELETE');
};