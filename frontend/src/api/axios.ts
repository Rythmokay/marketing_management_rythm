import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
    // Same server as the web app in production; in development Vite forwards /api to localhost:8080
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401 = session ended (expired, password changed or member removed): back to the login screen.
        // 403 only means "not allowed", so the person stays signed in.
        const isLogin = String(error.config?.url || '').includes('/auth/');
        if (error.response?.status === 401 && !isLogin && useAuthStore.getState().token) {
            useAuthStore.getState().logout();
            window.location.replace('/?session=ended');
        }
        return Promise.reject(error);
    }
);
