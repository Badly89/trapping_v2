// src/components/Settings/Settings.jsx
import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    Card,
    CardContent,
    Divider,
    Alert,
    Snackbar,
    Switch,
    FormControlLabel,
    Avatar,
    IconButton,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import {
    Save,
    Person,
    Email,
    Lock,
    Visibility,
    VisibilityOff,
    DarkMode,
    LightMode,
    Notifications,
    Security,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/api';

const Settings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    
    // Состояние для смены пароля
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [showPassword, setShowPassword] = useState({
        old: false,
        new: false,
        confirm: false,
    });
    
    // Состояние для настроек
    const [settings, setSettings] = useState({
        darkMode: localStorage.getItem('theme') === 'dark',
        notifications: true,
        emailNotifications: true,
    });

    const showNotification = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handlePasswordChange = async () => {
        if (passwordData.new_password !== passwordData.confirm_password) {
            showNotification('Новые пароли не совпадают', 'error');
            return;
        }
        
        if (passwordData.new_password.length < 6) {
            showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }
        
        setLoading(true);
        try {
        await auth.changePassword(passwordData.old_password, passwordData.new_password);
        showNotification('Пароль успешно изменен', 'success');
        setPasswordData({
            old_password: '',
            new_password: '',
            confirm_password: '',
        });
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Ошибка смены пароля', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleThemeToggle = () => {
        const newTheme = !settings.darkMode;
        setSettings({ ...settings, darkMode: newTheme });
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
        // Здесь можно добавить логику смены темы через контекст
        showNotification(`Тема изменена на ${newTheme ? 'темную' : 'светлую'}`, 'success');
    };

    const handleSaveSettings = () => {
        localStorage.setItem('notifications', settings.notifications);
        localStorage.setItem('emailNotifications', settings.emailNotifications);
        showNotification('Настройки сохранены', 'success');
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                Настройки
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Управление настройками аккаунта и системы
            </Typography>

            <Grid container spacing={3}>
                {/* Информация о профиле */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Avatar
                                    sx={{
                                        width: 64,
                                        height: 64,
                                        bgcolor: 'primary.main',
                                        fontSize: 32,
                                    }}
                                >
                                    {user?.username?.[0]?.toUpperCase() || 'U'}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">{user?.username}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {user?.role === 'admin' ? 'Администратор' : 
                                         user?.role === 'operator' ? 'Оператор' : 'Исполнитель'}
                                    </Typography>
                                </Box>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Email fontSize="small" color="action" />
                                <Typography variant="body2">{user?.email}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Person fontSize="small" color="action" />
                                <Typography variant="body2">ID: {user?.id}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Настройки системы */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Настройки системы
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.darkMode}
                                        onChange={handleThemeToggle}
                                        icon={<LightMode />}
                                        checkedIcon={<DarkMode />}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {settings.darkMode ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
                                        <span>{settings.darkMode ? 'Темная тема' : 'Светлая тема'}</span>
                                    </Box>
                                }
                                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', width: '100%' }}
                            />
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.notifications}
                                        onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Notifications fontSize="small" />
                                        <span>Уведомления в системе</span>
                                    </Box>
                                }
                                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', width: '100%' }}
                            />
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.emailNotifications}
                                        onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Email fontSize="small" />
                                        <span>Email уведомления</span>
                                    </Box>
                                }
                                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', width: '100%' }}
                            />
                            
                            <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSaveSettings}
                                sx={{ mt: 2 }}
                            >
                                Сохранить настройки
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Смена пароля */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <Lock sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Смена пароля
                            </Typography>
                            <Divider sx={{ mb: 3 }} />
                            
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Текущий пароль"
                                        type={showPassword.old ? 'text' : 'password'}
                                        value={passwordData.old_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => setShowPassword({ ...showPassword, old: !showPassword.old })}>
                                                        {showPassword.old ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Новый пароль"
                                        type={showPassword.new ? 'text' : 'password'}
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        helperText="Минимум 6 символов"
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}>
                                                        {showPassword.new ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <TextField
                                        fullWidth
                                        label="Подтверждение пароля"
                                        type={showPassword.confirm ? 'text' : 'password'}
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                        error={passwordData.new_password !== passwordData.confirm_password && passwordData.confirm_password !== ''}
                                        helperText={
                                            passwordData.new_password !== passwordData.confirm_password && 
                                            passwordData.confirm_password !== '' ? 
                                            'Пароли не совпадают' : ''
                                        }
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}>
                                                        {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                </Grid>
                            </Grid>
                            
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                                onClick={handlePasswordChange}
                                disabled={loading || !passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password}
                                sx={{ mt: 3 }}
                            >
                                {loading ? 'Сохранение...' : 'Сменить пароль'}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Информация о системе */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Информация о системе
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        Версия CRM
                                    </Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                        3.0.0
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        API версия
                                    </Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                        v3
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        Бот MAX
                                    </Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                        Активен
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        Поддержка
                                    </Typography>
                                    <Typography variant="body1" fontWeight="bold">
                                        MAX
                                    </Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Уведомления */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Settings;