// client/src/api/users.js
import { apiClient } from './client.js';

export const list = () => apiClient.get('/users');
export const listInvites = () => apiClient.get('/users/invites');
export const invite = (data) => apiClient.post('/users/invite', data);
export const updateRole = (id, role) => apiClient.patch(`/users/${id}/role`, { role });
export const setStatus = (id, isActive) => apiClient.patch(`/users/${id}/status`, { isActive });
