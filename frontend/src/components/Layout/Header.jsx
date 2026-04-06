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
    useTheme,
} from '@mui/material';
import { AccountCircle, Menu as MenuIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ drawerWidth = 280, onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
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
        <AppBar
            position="fixed"
            sx={{
                zIndex: theme.zIndex.drawer + 1,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.primary,
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
        >
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                    📊 CRM Система
                </Typography>
                
                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            {user.username} ({getRoleName(user.role)})
                        </Typography>
                        <IconButton
                            onClick={handleMenu}
                            size="small"
                            sx={{ p: 0 }}
                        >
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                {user.username[0].toUpperCase()}
                            </Avatar>
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                            <MenuItem onClick={handleLogout}>Выйти</MenuItem>
                        </Menu>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Header;