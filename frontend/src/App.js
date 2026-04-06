// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';  // Импортируем ThemeProvider
import CssBaseline from '@mui/material/CssBaseline';   // Импортируем CssBaseline для нормализации стилей
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import Login from './components/Auth/Login';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import MessageList from './components/Messages/MessageList';
import TaskList from './components/Tasks/TaskList';
import ReportList from './components/Reports/ReportList';
import UserList from './components/Users/UserList';
import Settings from './components/Settings/Settings';
import { theme } from './theme';  // Импортируем созданную тему

import TestTime from './components/TestTime';


const AppRoutes = () => {
    const { isAdmin } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/messages" element={<MessageList />} />
                <Route path="/tasks" element={<TaskList />} />
                <Route path="/reports" element={<ReportList />} />
                {isAdmin && <Route path="/users" element={<UserList />} />}
                <Route path="/settings" element={<Settings />} />
                <Route path="/test-time" element={<TestTime />} />
            </Route>
        </Routes>
    );
};

function App() {
    return (
        <ThemeProvider theme={theme}>      {/* Оборачиваем приложение в ThemeProvider */}
            <CssBaseline />                 {/* Сбрасываем CSS стили */}
            <Router>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </Router>
        </ThemeProvider>
    );
}

export default App;