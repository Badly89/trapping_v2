// src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';
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
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [settings, setSettings] = useState({
        system: localStorage.getItem('notifications') !== 'false',
        email: localStorage.getItem('emailNotifications') === 'true',
    });

    // Загрузка уведомлений из API
    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications/internal');
            setNotifications(response.data);
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Обновлять каждые 30 секунд
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // ВНУТРЕННЕЕ УВЕДОМЛЕНИЕ (snackbar)
    const showNotification = (message, severity = 'info', type = 'system') => {
        // Показываем snackbar для системных уведомлений
        if (type === 'system' && settings.system) {
            setSnackbar({ open: true, message, severity });
        }
        
        // Email уведомления
        if (type === 'email' && settings.email) {
            console.log('📧 Email notification:', message);
        }
    };

    const closeSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const markAsRead = async (id) => {
        try {
            await api.patch(`/notifications/internal/${id}/read`);
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === id ? { ...notif, is_read: true } : notif
                )
            );
        } catch (error) {
            console.error('Ошибка отметки уведомления:', error);
        }
    };

    const clearAll = async () => {
        try {
            await api.patch('/notifications/internal/read-all');
            setNotifications(prev =>
                prev.map(notif => ({ ...notif, is_read: true }))
            );
        } catch (error) {
            console.error('Ошибка очистки уведомлений:', error);
        }
    };

    const updateSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('notifications', newSettings.system);
        localStorage.setItem('emailNotifications', newSettings.email);
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                loading,
                unreadCount,
                showNotification,
                markAsRead,
                clearAll,
                settings,
                updateSettings,
            }}
        >
            {children}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={closeSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
};