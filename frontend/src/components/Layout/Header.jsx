// src/components/Layout/Header.jsx
import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    IconButton,
    Menu,
    MenuItem,
    Avatar,
    Badge,
    Divider
} from '@mui/material';
import { Notifications } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
    const { user, logout } = useAuth();
    const { notifications, markAsRead, clearAll } = useNotification();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState(null);
    const [notifAnchorEl, setNotifAnchorEl] = React.useState(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotifOpen = (event) => {
        setNotifAnchorEl(event.currentTarget);
    };

    const handleNotifClose = () => {
        setNotifAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
        handleClose();
    };

    const getRoleName = (role) => {
        const roles = {
            admin: 'Администратор',
            operator: 'Оператор',
            executor: 'Исполнитель',
        };
        return roles[role] || role;
    };

    return (
        <AppBar position="fixed" sx={{ zIndex: 1201 }}>
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    📊 CRM Система
                </Typography>
                
                {/* Кнопка уведомлений */}
                <IconButton color="inherit" onClick={handleNotifOpen}>
                    <Badge badgeContent={unreadCount} color="error">
                        <Notifications />
                    </Badge>
                </IconButton>
                <Menu
                    anchorEl={notifAnchorEl}
                    open={Boolean(notifAnchorEl)}
                    onClose={handleNotifClose}
                    sx={{ mt: 2 }}
                >
                    {notifications.length === 0 ? (
                        <MenuItem disabled>Нет уведомлений</MenuItem>
                    ) : (
                        <>
                            {notifications.slice(0, 5).map((notif) => (
                                <MenuItem key={notif.id} onClick={() => markAsRead(notif.id)}>
                                    <Box sx={{ maxWidth: 300 }}>
                                        <Typography variant="body2">{notif.message}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(notif.timestamp).toLocaleString('ru-RU')}
                                        </Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                            <Divider />
                            <MenuItem onClick={() => { navigate('/settings'); handleNotifClose(); }}>
                                Все уведомления
                            </MenuItem>
                        </>
                    )}
                </Menu>
                
                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2 }}>
                        <Typography variant="body2">
                            {user.username} ({getRoleName(user.role)})
                        </Typography>
                        <IconButton onClick={handleMenu} size="small">
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                                {user.username[0].toUpperCase()}
                            </Avatar>
                        </IconButton>
                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                            <MenuItem onClick={() => { navigate('/settings'); handleClose(); }}>
                                Настройки
                            </MenuItem>
                            <MenuItem onClick={handleLogout}>Выйти</MenuItem>
                        </Menu>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Header;