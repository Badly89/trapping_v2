// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Интерцептор для добавления токена
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Аутентификация
export const auth = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    getMe: () => api.get('/auth/me'),
    changePassword: (old_password, new_password) => 
        api.patch('/auth/change-password', { old_password, new_password }),  // Добавить
    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
    },
};

// Пользователи
export const users = {
   getAll: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (userId, data) => api.patch(`/users/${userId}`, data),  // Добавить
    toggle: (userId) => api.patch(`/users/${userId}/toggle`),
};

// Сообщения
export const messages = {
    getAll: (params) => api.get('/messages', { params }),
    getById: (id) => api.get(`/messages/${id}`),
    update: (id, data) => api.patch(`/messages/${id}`, data),
    getStatistics: () => api.get('/statistics'),
};

// Задачи
export const tasks = {
    getAll: (params) => api.get('/tasks', { params }),
    getById: (id) => api.get(`/tasks/${id}`),
    create: (data) => api.post('/tasks', data),
    update: (id, data) => api.patch(`/tasks/${id}`, data),
};


// src/services/api.js - добавьте перехват ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Не показываем ошибку 403 для запросов пользователей, если пользователь не админ
        if (error.response?.status === 403 && error.config?.url?.includes('/users')) {
            console.warn('Доступ к списку пользователей запрещен (недостаточно прав)');
            return Promise.resolve({ data: [] });
        }
        
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// src/services/api.js - убедитесь, что есть метод create
export const reports = {
    getByMessage: (messageId) => api.get(`/reports/${messageId}`),
    create: (formData) => api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;