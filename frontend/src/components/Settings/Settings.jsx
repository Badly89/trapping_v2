// src/components/Settings/Settings.jsx
import React, { useState, useEffect } from 'react';
import {
    Box,
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
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Badge,
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
    NotificationsActive,
    NotificationsOff,
    Delete,
    CheckCircle,
    Send as SendIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { auth } from '../../services/api';

const Settings = () => {
    const { user } = useAuth();
    const { darkMode, toggleTheme } = useTheme();
    const { 
        notifications, 
        showNotification, 
        markAsRead, 
        clearAll,
        settings: notifSettings,
        updateSettings 
    } = useNotification();
    
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
    
    // Состояние для настроек уведомлений
    const [localSettings, setLocalSettings] = useState({
        system: notifSettings.system,
        email: notifSettings.email,
    });
    
    const [notificationEmail, setNotificationEmail] = useState(user?.email || '');
    const [testEmailLoading, setTestEmailLoading] = useState(false);

    const handleNotification = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
        if (severity === 'success') {
            showNotification(message, 'info');
        }
    };

    const handlePasswordChange = async () => {
        if (passwordData.new_password !== passwordData.confirm_password) {
            handleNotification('Новые пароли не совпадают', 'error');
            return;
        }
        
        if (passwordData.new_password.length < 6) {
            handleNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }
        
        setLoading(true);
        try {
            await auth.changePassword(passwordData.old_password, passwordData.new_password);
            handleNotification('Пароль успешно изменен', 'success');
            showNotification('Пароль успешно изменен', 'success');
            setPasswordData({
                old_password: '',
                new_password: '',
                confirm_password: '',
            });
        } catch (error) {
            handleNotification(error.response?.data?.detail || 'Ошибка смены пароля', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleThemeToggle = () => {
        toggleTheme();
        handleNotification(`Тема изменена на ${!darkMode ? 'темную' : 'светлую'}`, 'success');
        showNotification(`Тема изменена на ${!darkMode ? 'темную' : 'светлую'}`, 'info');
    };

    const handleSaveSettings = () => {
        updateSettings(localSettings);
        handleNotification('Настройки сохранены', 'success');
        showNotification('Настройки уведомлений обновлены', 'info');
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Добавьте функцию отправки теста
const sendTestEmail = async () => {
    const emailToSend = notificationEmail || user?.email;
    if (!emailToSend) {
        handleNotification('Укажите email для отправки', 'error');
        return;
    }
    
    setTestEmailLoading(true);
    try {
        const response = await api.post('/notifications/test-email', { email: emailToSend });
        handleNotification(response.data.message, 'success');
    } catch (error) {
        handleNotification(error.response?.data?.detail || 'Ошибка отправки тестового письма', 'error');
    } finally {
        setTestEmailLoading(false);
    }
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
                                        checked={darkMode}
                                        onChange={handleThemeToggle}
                                        icon={<LightMode />}
                                        checkedIcon={<DarkMode />}
                                    />
                                }
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {darkMode ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
                                        <span>{darkMode ? 'Темная тема' : 'Светлая тема'}</span>
                                    </Box>
                                }
                                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', width: '100%' }}
                            />
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={localSettings.system}
                                        onChange={(e) => setLocalSettings({ ...localSettings, system: e.target.checked })}
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
                                        checked={localSettings.email}
                                        onChange={(e) => setLocalSettings({ ...localSettings, email: e.target.checked })}
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

                {/* История уведомлений */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    <Badge badgeContent={unreadCount} color="error">
                                        <NotificationsActive />
                                    </Badge>
                                    {' '}Уведомления
                                </Typography>
                                {notifications.length > 0 && (
                                    <Button size="small" onClick={clearAll} startIcon={<Delete />}>
                                        Очистить все
                                    </Button>
                                )}
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            
                            {notifications.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <NotificationsOff sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                                    <Typography color="text.secondary">
                                        Нет уведомлений
                                    </Typography>
                                </Box>
                            ) : (
                                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                                    {notifications.map((notif) => (
                                        <ListItem
                                            key={notif.id}
                                            sx={{
                                                bgcolor: notif.read ? 'transparent' : 'action.hover',
                                                borderRadius: 1,
                                                mb: 1,
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => markAsRead(notif.id)}
                                        >
                                            <ListItemIcon>
                                                {notif.severity === 'success' && <CheckCircle color="success" />}
                                                {notif.severity === 'error' && <Security color="error" />}
                                                {notif.severity === 'info' && <Notifications color="info" />}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={notif.message}
                                                secondary={new Date(notif.timestamp).toLocaleString('ru-RU')}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                // Email уведомления
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Email уведомления
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={localSettings.email}
                                        onChange={(e) => setLocalSettings({ ...localSettings, email: e.target.checked })}
                                    />
                                }
                                label="Получать уведомления на email"
                                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', width: '100%' }}
                            />
                            
                            <TextField
                                fullWidth
                                label="Email для уведомлений"
                                type="email"
                                value={notificationEmail}
                                onChange={(e) => setNotificationEmail(e.target.value)}
                                margin="normal"
                                helperText="Укажите email для получения уведомлений"
                                disabled={!localSettings.email}
                            />
                            
                            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<Save />}
                                    onClick={handleSaveSettings}
                                    sx={{ flex: 1 }}
                                >
                                    Сохранить
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={testEmailLoading ? <CircularProgress size={20} /> : <SendIcon />}
                                    onClick={sendTestEmail}
                                    disabled={testEmailLoading || !notificationEmail || !localSettings.email}
                                    sx={{ flex: 1 }}
                                >
                                    {testEmailLoading ? 'Отправка...' : 'Тест'}
                                </Button>
                            </Box>
                            
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <strong>Уведомления будут приходить на email о:</strong>
                                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                                    <li>Новых сообщениях</li>
                                    <li>Назначенных задачах</li>
                                    <li>Завершенных задачах</li>
                                    <li>Изменении статусов</li>
                                    <li>Новых отчетах</li>
                                </ul>
                            </Alert>
                        </CardContent>
                    </Card>
                </Grid>
                {/* Смена пароля */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                <Lock sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Смена пароля
                            </Typography>
                            <Divider sx={{ mb: 3 }} />
                            
                            <TextField
                                fullWidth
                                label="Текущий пароль"
                                type={showPassword.old ? 'text' : 'password'}
                                value={passwordData.old_password}
                                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                margin="normal"
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
                            <TextField
                                fullWidth
                                label="Новый пароль"
                                type={showPassword.new ? 'text' : 'password'}
                                value={passwordData.new_password}
                                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                margin="normal"
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
                            <TextField
                                fullWidth
                                label="Подтверждение пароля"
                                type={showPassword.confirm ? 'text' : 'password'}
                                value={passwordData.confirm_password}
                                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                margin="normal"
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
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={handleCloseSnackbar}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Settings;