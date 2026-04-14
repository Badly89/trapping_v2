// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import PrivateRoute from './components/Auth/PrivateRoute';
import Login from './components/Auth/Login';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import MessageList from './components/Messages/MessageList';
import TaskList from './components/Tasks/TaskList';
import ReportList from './components/Reports/ReportList';
import UserList from './components/Users/UserList';
import Settings from './components/Settings/Settings';

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
            </Route>
        </Routes>
    );
};

function App() {
    return (
        <ThemeProvider>
            <CssBaseline />
            <NotificationProvider>
                <Router>
                    <AuthProvider>
                        <AppRoutes />
                    </AuthProvider>
                </Router>
            </NotificationProvider>
        </ThemeProvider>
    );
}

export default App;