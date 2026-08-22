import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Request Interceptor: Inject Access Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = parseJwt(token);
      console.log("[AUTH DEBUG] Token role:", decoded?.role);
    }
    console.log("[AUTH DEBUG] Token:", token);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Refresh Tokens Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    console.error(`[API FAILURE DEBUG] Request failed: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.status, error.response?.data);
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

    // Retry logic for Network/Timeout Errors or 5xx Server Errors (max 2 retries)
    const isRetryableError = !error.response || (error.response.status >= 500 && error.response.status <= 599);
    const retryCount = originalRequest._retryCount || 0;

    if (isRetryableError && retryCount < 2) {
      originalRequest._retryCount = retryCount + 1;
      console.warn(`[API RETRY] Retrying request ${originalRequest.method?.toUpperCase()} ${originalRequest.url} (Attempt ${retryCount + 1}/2) due to network/server failure.`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return api(originalRequest);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          localStorage.setItem('token', data.access_token);
          localStorage.setItem('role', 'driver');
          localStorage.setItem('refresh_token', data.refresh_token);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
