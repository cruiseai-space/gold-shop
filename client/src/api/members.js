import { apiClient } from './client.js';

export const list = (filters) => apiClient.get('/members', { params: filters });
export const getById = (id) => apiClient.get(`/members/${id}`);
export const create = (data) => apiClient.post('/members', data);
export const update = (id, data) => apiClient.patch(`/members/${id}`, data);
