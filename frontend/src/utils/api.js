import axios from 'axios';

// Base API URL
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // required for cookies (refresh tokens)
});

let accessToken = '';

export const setLocalAccessToken = (token) => {
  accessToken = token;
};

// Request interceptor to attach JWT
api.interceptors.request.use(
  (config) => {
    if (accessToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh automatically on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Request token refresh
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        if (res.data.success && res.data.accessToken) {
          setLocalAccessToken(res.data.accessToken);
          
          // Retry original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed -> logout user locally
        accessToken = '';
        // Clear session event to be caught by UI
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
