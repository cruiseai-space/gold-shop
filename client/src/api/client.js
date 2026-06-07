// client/src/api/client.js
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Attach JWT to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('swarna_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response.data,  // unwrap .data automatically
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('swarna_token');
      localStorage.removeItem('swarna_user');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Return a unified error object
    const errorMessage = error.response?.data?.error?.message || error.message || 'An unexpected error occurred';
    const errorCode = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    
    return Promise.reject({
      message: errorMessage,
      code: errorCode,
      status: error.response?.status
    });
  }
);
