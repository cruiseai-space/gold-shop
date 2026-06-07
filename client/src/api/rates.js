// client/src/api/rates.js
import { apiClient } from './client.js';

export const list = (filters) => apiClient.get('/rates', { params: filters });
export const getToday = () => apiClient.get('/rates/today');
export const create = (data) => apiClient.post('/rates', data);
