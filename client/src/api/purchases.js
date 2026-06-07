// client/src/api/purchases.js
import { apiClient } from './client.js';

export const list = (filters) => apiClient.get('/purchases', { params: filters });
export const getById = (id) => apiClient.get(`/purchases/${id}`);
export const create = (data) => apiClient.post('/purchases', data);
export const update = (id, data) => apiClient.patch(`/purchases/${id}`, data);
export const remove = (id) => apiClient.delete(`/purchases/${id}`);
