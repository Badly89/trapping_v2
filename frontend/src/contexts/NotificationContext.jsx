// src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';

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
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Загрузка настроек уведомлений
    const [settings, setSettings] = useState({
        system: localStorage.getItem('notifications') !== 'false',
        email: localStorage.getItem('emailNotifications') === 'true',
    });

    // Сохранение настроек
    useEffect(() => {
        localStorage.setItem('notifications', settings.system);
        localStorage.setItem('emailNotifications', settings.email);
    }, [settings]);

    // Показать уведомление
    const showNotification = (message, severity = 'info', type = 'system') => {
        // Системное уведомление
        if (type === 'system' && settings.system) {
            setSnackbar({ open: true, message, severity });
        }
        
        // Добавляем в список уведомлений
        const newNotification = {
            id: Date.now(),
            message,
            severity,
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev]);
        
        // Email уведомление (имитация)
        if (type === 'email' && settings.email) {
            console.log('📧 Email notification:', message);
            // Здесь будет реальная отправка email
        }
    };

    // Закрыть snackbar
    const closeSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // Отметить как прочитанное
    const markAsRead = (id) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === id ? { ...notif, read: true } : notif
            )
        );
    };

    // Очистить все уведомления
    const clearAll = () => {
        setNotifications([]);
    };

    // Обновить настройки
    const updateSettings = (newSettings) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
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
                autoHideDuration={6000}
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