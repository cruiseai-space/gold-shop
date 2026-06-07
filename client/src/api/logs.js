// client/src/api/logs.js
import { apiClient } from './client.js';

export const list = (filters) => apiClient.get('/logs', { params: filters });
