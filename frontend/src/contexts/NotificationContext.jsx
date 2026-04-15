// src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({
        system: localStorage.getItem('notifications') !== 'false',
        email: localStorage.getItem('emailNotifications') === 'true',
    });

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setLoading(false);
                return;
            }
            const response = await api.get('/notifications/internal');
            setNotifications(response.data);
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
            // Не показываем ошибку пользователю
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/internal/${id}/read`);
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === id ? { ...notif, is_read: true } : notif
                )
            );
        } catch (error) {
            console.error('Ошибка:', error);
        }
    };

    const clearAll = async () => {
        try {
            await api.patch('/notifications/internal/read-all');
            setNotifications(prev =>
                prev.map(notif => ({ ...notif, is_read: true }))
            );
        } catch (error) {
            console.error('Ошибка:', error);
        }
    };

    const showNotification = (message, severity = 'info', type = 'system') => {
        if (type === 'email' && settings.email) {
            console.log('📧 Email:', message);
        }
    };

    const updateSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('notifications', newSettings.system);
        localStorage.setItem('emailNotifications', newSettings.email);
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                loading,
                showNotification,
                markAsRead,
                clearAll,
                settings,
                updateSettings,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};