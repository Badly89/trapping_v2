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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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
    Edit,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import { auth } from '../../services/api';
import api from '../../services/api';

const Settings = () => {
    const { user, updateUser } = useAuth(); // добавим updateUser если есть
    const { darkMode, toggleTheme } = useTheme();
    const { 
        notifications, 
        showNotification, 
        markAsRead, 
        clearAll,
        settings: notifSettings,
        updateSettings 
    } = useNotification();
    
    const [userSettings, setUserSettings] = useState({
        notifications_enabled: true,
        notification_email: '',
    });
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [emailLoading, setEmailLoading] = useState(false);
    
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
    const [localSettings, setLocalSettings] = useState({
        system: notifSettings.system,
        email: notifSettings.email,
    });
    
    // Состояние для редактирования email профиля
    const [editEmail, setEditEmail] = useState(false);
    const [newEmail, setNewEmail] = useState(user?.email || '');
    
    // Состояние для SMTP диалога
    const [smtpDialogOpen, setSmtpDialogOpen] = useState(false);
    const [smtpSettings, setSmtpSettings] = useState({
        host: '',
        port: '465',
        user: '',
        password: '',
        from: '',
    });
    const [smtpLoading, setSmtpLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    
    // Загрузка SMTP настроек
    const fetchSmtpSettings = async () => {
        try {
            const response = await api.get('/notifications/smtp-settings');
            setSmtpSettings({
                host: response.data.host || '',
                port: response.data.port || '465',
                user: response.data.user || '',
                password: '',
                from: response.data.from || '',
            });
        } catch (error) {
            console.error('Ошибка загрузки SMTP настроек:', error);
        }
    };
    
    // Сохранение SMTP настроек
    const saveSmtpSettings = async () => {
        setSmtpLoading(true);
        try {
            const payload = {
                host: smtpSettings.host,
                port: parseInt(smtpSettings.port),
                user: smtpSettings.user,
                password: smtpSettings.password,
                from_email: smtpSettings.from
            };
            await api.post('/notifications/smtp-settings', payload);
            showNotification('SMTP настройки сохранены', 'success');
            setSmtpDialogOpen(false);
            setLocalSettings({ ...localSettings, email: true });
            updateSettings({ ...localSettings, email: true });
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Ошибка сохранения SMTP настроек', 'error');
        } finally {
            setSmtpLoading(false);
        }
    };
    
    // Тестовая отправка email (использует email из профиля)
    const sendTestEmail = async () => {
        const emailToSend = user?.email;
        if (!emailToSend) {
            showNotification('Сначала укажите email в профиле', 'error');
            return;
        }
        
        setTestLoading(true);
        try {
            const response = await api.post('/notifications/test-email', { email: emailToSend });
            showNotification(response.data.message, 'success');
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Ошибка отправки тестового письма', 'error');
        } finally {
            setTestLoading(false);
        }
    };
    
    // Обновление email пользователя
    const updateUserEmail = async () => {
        if (!newEmail || newEmail === user?.email) {
            setEditEmail(false);
            return;
        }
        
        setEmailLoading(true);
        try {
            await api.patch('/user/update-email', { email: newEmail });
            
            // Обновляем контекст
            updateUser({ email: newEmail });
            
            showNotification('Email успешно обновлен', 'success');
            setEditEmail(false);
        } catch (error) {
            showNotification(error.response?.data?.detail || 'Ошибка обновления email', 'error');
        } finally {
            setEmailLoading(false);
        }
    };
    
    // Обработчик переключения email уведомлений
    const handleEmailToggle = (e) => {
        const isChecked = e.target.checked;
        
        if (isChecked) {
            fetchSmtpSettings();
            setSmtpDialogOpen(true);
        } else {
            setLocalSettings({ ...localSettings, email: false });
            updateSettings({ ...localSettings, email: false });
        }
    };
    
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

    // Загрузка настроек пользователя
    const fetchUserSettings = async () => {
        try {
            const response = await api.get('/user/notification-settings');
            setUserSettings(response.data);
            setLocalSettings({ ...localSettings, email: response.data.notifications_enabled });
            setNotificationEmail(response.data.notification_email || user?.email || '');
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    };

    // Сохранение настроек пользователя
    const saveUserSettings = async () => {
        try {
            await api.post('/user/notification-settings', {
                notifications_enabled: localSettings.email,
                notification_email: notificationEmail
            });
            showNotification('Настройки сохранены', 'success');
        } catch (error) {
            showNotification('Ошибка сохранения настроек', 'error');
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    useEffect(() => {
        fetchUserSettings();
        fetchSmtpSettings();
    }, []);

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
                                {editEmail ? (
                                    <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                                        <TextField
                                            size="small"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="Email"
                                            fullWidth
                                            autoFocus
                                        />
                                        <Button size="small" onClick={updateUserEmail} disabled={emailLoading}>
                                            {emailLoading ? <CircularProgress size={20} /> : 'Сохранить'}
                                        </Button>
                                        <Button size="small" onClick={() => setEditEmail(false)}>Отмена</Button>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                                        <Typography variant="body2">
                                            {user?.email || 'Email не указан'}
                                        </Typography>
                                        <IconButton size="small" onClick={() => {
                                            setNewEmail(user?.email || '');
                                            setEditEmail(true);
                                        }}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Box>
                                )}
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

                {/* Email уведомления */}
                
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
                                        onChange={handleEmailToggle}
                                    />
                                }
                                label="Получать уведомления на email"
                                sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', width: '100%' }}
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
                                    startIcon={testLoading ? <CircularProgress size={20} /> : <SendIcon />}
                                    onClick={sendTestEmail}
                                    disabled={testLoading || !localSettings.email || !user?.email}
                                    sx={{ flex: 1 }}
                                >
                                    {testLoading ? 'Отправка...' : 'Тест'}
                                </Button>
                            </Box>
                            
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

            {/* Диалог настройки SMTP */}
            <Dialog open={smtpDialogOpen} onClose={() => setSmtpDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Email color="primary" />
                        <Typography variant="h6">Настройка Email уведомлений</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
                        Для получения email уведомлений необходимо настроить SMTP сервер.
                        <br />
                        <strong>Пример для Яндекс.Почты:</strong>
                        <br />
                        Хост: smtp.yandex.ru
                        <br />
                        Порт: 465
                        <br />
                        Пользователь: ваш_email@yandex.ru
                        <br />
                        Пароль: пароль_приложения
                    </Alert>
                    
                    <TextField
                        fullWidth
                        label="SMTP Хост"
                        value={smtpSettings.host}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                        margin="normal"
                        placeholder="smtp.yandex.ru"
                    />
                    
                    <TextField
                        fullWidth
                        label="SMTP Порт"
                        type="number"
                        value={smtpSettings.port}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                        margin="normal"
                        placeholder="465"
                    />
                    
                    <TextField
                        fullWidth
                        label="SMTP Пользователь"
                        type="email"
                        value={smtpSettings.user}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                        margin="normal"
                        placeholder="your-email@example.com"
                    />
                    
                    <TextField
                        fullWidth
                        label="SMTP Пароль"
                        type="password"
                        value={smtpSettings.password}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                        margin="normal"
                        helperText="Для Яндекс и Gmail используйте пароль приложения"
                    />
                    
                    <TextField
                        fullWidth
                        label="Email отправителя"
                        type="email"
                        value={smtpSettings.from}
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, from: e.target.value })}
                        margin="normal"
                        placeholder="noreply@crm.local"
                    />
                    
                    <Button
                        variant="outlined"
                        startIcon={<SendIcon />}
                        onClick={sendTestEmail}
                        disabled={testLoading}
                        sx={{ mt: 2 }}
                        fullWidth
                    >
                        {testLoading ? <CircularProgress size={24} /> : 'Отправить тестовое письмо'}
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSmtpDialogOpen(false)}>Отмена</Button>
                    <Button onClick={saveSmtpSettings} variant="contained" disabled={smtpLoading}>
                        {smtpLoading ? <CircularProgress size={24} /> : 'Сохранить и включить'}
                    </Button>
                </DialogActions>
            </Dialog>

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