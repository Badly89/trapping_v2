// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('access_token');
            const savedUser = localStorage.getItem('user');
            
            if (token && savedUser) {
                try {
                    // Загружаем актуальные данные пользователя из API
                    const response = await auth.getMe();
                    const userData = {
                        id: response.data.id,
                        username: response.data.username,
                        role: response.data.role,
                        email: response.data.email,
                        full_name: response.data.full_name,
                    };
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                } catch (error) {
                    console.error('Ошибка загрузки пользователя:', error);
                    // Если ошибка, используем сохраненные данные
                    setUser(JSON.parse(savedUser));
                }
            }
            setLoading(false);
        };
        
        loadUser();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await auth.login(username, password);
            const { access_token, user_id, username: userName, role } = response.data;
            
            localStorage.setItem('access_token', access_token);
            
            // Загружаем полные данные пользователя
            const meResponse = await auth.getMe();
            const userData = {
                id: user_id,
                username: userName,
                role: role,
                email: meResponse.data.email,
                full_name: meResponse.data.full_name,
            };
            
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.detail || 'Ошибка входа' 
            };
        }
    };

    const updateUser = (updatedData) => {
        const newUser = { ...user, ...updatedData };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const logout = () => {
        auth.logout();
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isOperator: user?.role === 'operator',
        isExecutor: user?.role === 'executor',
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};