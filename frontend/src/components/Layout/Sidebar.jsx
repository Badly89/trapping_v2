// src/components/Layout/Sidebar.jsx
import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Box,
    Typography,
    Divider,
    useTheme,
} from '@mui/material';
import {
    Dashboard,
    Message,
    Assignment,
    Description,
    People,
    Settings,
    Help,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ drawerWidth = 280 }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { isAdmin, user } = useAuth();

    const menuItems = [
        { text: 'Дашборд', icon: <Dashboard />, path: '/dashboard', roles: ['admin', 'operator', 'executor'] },
        { text: 'Сообщения', icon: <Message />, path: '/messages', roles: ['admin', 'operator', 'executor'] },
        { text: 'Задачи', icon: <Assignment />, path: '/tasks', roles: ['admin', 'operator', 'executor'] },
        { text: 'Отчеты', icon: <Description />, path: '/reports', roles: ['admin', 'operator'] },
    ];

    if (isAdmin) {
        menuItems.push({ text: 'Пользователи', icon: <People />, path: '/users', roles: ['admin'] });
    }

    const getRoleName = (role) => {
        const roles = {
            admin: 'Администратор',
            operator: 'Оператор',
            executor: 'Исполнитель',
        };
        return roles[role] || role;
    };

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    borderRight: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    position: 'fixed',
                    height: '100vh',
                    top: 0,
                    left: 0,
                },
            }}
        >
            {/* Логотип */}
            <Box
                sx={{
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    📊 CRM
                </Typography>
            </Box>

            {/* Информация о пользователе */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                    }}
                >
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                </Box>
                <Box>
                    <Typography variant="body2" fontWeight="bold">
                        {user?.username || 'Пользователь'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {getRoleName(user?.role)}
                    </Typography>
                </Box>
            </Box>

            {/* Меню навигации */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                onClick={() => navigate(item.path)}
                                selected={location.pathname === item.path}
                                sx={{
                                    mx: 1,
                                    borderRadius: 1,
                                    '&.Mui-selected': {
                                        backgroundColor: theme.palette.primary.main + '20',
                                        '&:hover': {
                                            backgroundColor: theme.palette.primary.main + '30',
                                        },
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? theme.palette.primary.main : 'inherit' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText 
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>

            {/* Нижняя часть сайдбара */}
            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                <List>
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => window.open('https://t.me/your_bot', '_blank')}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Help />
                            </ListItemIcon>
                            <ListItemText primary="Помощь" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton onClick={() => navigate('/settings')}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                                <Settings />
                            </ListItemIcon>
                            <ListItemText primary="Настройки" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>
        </Drawer>
    );
};

export default Sidebar;