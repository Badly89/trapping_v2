// src/components/Users/UserList.jsx
import React, { useState, useEffect } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Box,
    CircularProgress,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Alert,
    Grid,
    Card,
    CardContent,
    Avatar,
    Tooltip,
    useTheme,
} from '@mui/material';
import {
    Edit,
    Delete,
    Add,
    Save,
    Cancel,
    People,
    AdminPanelSettings,
    Settings,
    CheckCircle,
    Block,
} from '@mui/icons-material';
import { users } from '../../services/api';  // <-- ДОБАВИТЬ ЭТОТ ИМПОРТ

const roleColors = {
    admin: 'error',
    operator: 'primary',
    executor: 'success',
};

const roleLabels = {
    admin: 'Администратор',
    operator: 'Оператор',
    executor: 'Исполнитель',
};

const roleIcons = {
    admin: <AdminPanelSettings fontSize="small" />,
    operator: <Settings fontSize="small" />,
    executor: <People fontSize="small" />,
};

const UserList = () => {
    const theme = useTheme();
    const [userList, setUserList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'operator',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await users.getAll();
            setUserList(response.data);
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddDialog = () => {
        setEditingUser(null);
        setFormData({
            username: '',
            email: '',
            full_name: '',
            password: '',
            role: 'operator',
        });
        setError('');
        setSuccess('');
        setDialogOpen(true);
    };

    const handleOpenEditDialog = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            password: '',
            role: user.role,
        });
        setError('');
        setSuccess('');
        setEditDialogOpen(true);
    };

    const handleCloseDialogs = () => {
        setDialogOpen(false);
        setEditDialogOpen(false);
        setEditingUser(null);
    };

    const handleCreateUser = async () => {
        if (!formData.username || !formData.email || !formData.full_name || !formData.password) {
            setError('Заполните все обязательные поля');
            return;
        }
        
        try {
            await users.create(formData);
            setSuccess('Пользователь успешно создан');
            setTimeout(() => {
                fetchUsers();
                handleCloseDialogs();
                setSuccess('');
            }, 1500);
        } catch (error) {
            setError(error.response?.data?.detail || 'Ошибка создания пользователя');
        }
    };

    const handleUpdateUser = async () => {
        if (!formData.email || !formData.full_name) {
            setError('Заполните обязательные поля');
            return;
        }
        
        try {
            const updateData = {
                email: formData.email,
                full_name: formData.full_name,
                role: formData.role,
            };
            if (formData.password) {
                updateData.password = formData.password;
            }
            
            await users.update(editingUser.id, updateData);
            setSuccess('Пользователь успешно обновлен');
            setTimeout(() => {
                fetchUsers();
                handleCloseDialogs();
                setSuccess('');
            }, 1500);
        } catch (error) {
            setError(error.response?.data?.detail || 'Ошибка обновления пользователя');
        }
    };

    const handleToggleUser = async (userId) => {
        try {
            await users.toggle(userId);
            fetchUsers();
        } catch (error) {
            console.error('Ошибка изменения статуса:', error);
        }
    };

    const stats = {
        total: userList.length,
        active: userList.filter(u => u.is_active).length,
        roles: 3,
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Заголовок */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                    Управление пользователями
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Управление учетными записями и ролями пользователей системы
                </Typography>
            </Box>

            {/* Карточки статистики */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Всего пользователей
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold">
                                        {stats.total}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 56, height: 56 }}>
                                    <People sx={{ fontSize: 32 }} />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Активные
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold" color="success.main">
                                        {stats.active}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: theme.palette.success.main, width: 56, height: 56 }}>
                                    <CheckCircle sx={{ fontSize: 32 }} />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Ролей в системе
                                    </Typography>
                                    <Typography variant="h3" fontWeight="bold">
                                        {stats.roles}
                                    </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: theme.palette.warning.main, width: 56, height: 56 }}>
                                    <AdminPanelSettings sx={{ fontSize: 32 }} />
                                </Avatar>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Кнопка добавления */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleOpenAddDialog}
                    sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
                >
                    Добавить пользователя
                </Button>
            </Box>

            {/* Таблица пользователей */}
            <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: theme.palette.grey[50] }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Имя пользователя</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Полное имя</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Роль</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Статус</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="center">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : userList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        Нет пользователей
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            userList.map((user) => (
                                <TableRow key={user.id} hover>
                                    <TableCell>{user.id}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar 
                                                sx={{ 
                                                    width: 36, 
                                                    height: 36, 
                                                    bgcolor: `${roleColors[user.role]}.main`,
                                                    fontSize: '1rem'
                                                }}
                                            >
                                                {user.username[0].toUpperCase()}
                                            </Avatar>
                                            <Typography variant="body2" fontWeight="medium">
                                                {user.username}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.full_name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            icon={roleIcons[user.role]}
                                            label={roleLabels[user.role]}
                                            color={roleColors[user.role]}
                                            size="small"
                                            sx={{ borderRadius: 1 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.is_active ? 'Активен' : 'Заблокирован'}
                                            color={user.is_active ? 'success' : 'error'}
                                            size="small"
                                            variant="outlined"
                                            sx={{ borderRadius: 1 }}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                            <Tooltip title="Редактировать">
                                                <IconButton
                                                    onClick={() => handleOpenEditDialog(user)}
                                                    size="small"
                                                    color="primary"
                                                >
                                                    <Edit />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={user.is_active ? 'Заблокировать' : 'Активировать'}>
                                                <IconButton
                                                    onClick={() => handleToggleUser(user.id)}
                                                    size="small"
                                                    color={user.is_active ? 'error' : 'success'}
                                                >
                                                    {user.is_active ? <Block /> : <CheckCircle />}
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Диалог добавления пользователя */}
            <Dialog open={dialogOpen} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">
                        Добавление пользователя
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, mt: 1 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mb: 2, mt: 1 }} onClose={() => setSuccess('')}>
                            {success}
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        label="Имя пользователя"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Полное имя"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Пароль"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        select
                        fullWidth
                        label="Роль"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        margin="normal"
                    >
                        <MenuItem value="admin">Администратор</MenuItem>
                        <MenuItem value="operator">Оператор</MenuItem>
                        <MenuItem value="executor">Исполнитель</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialogs} startIcon={<Cancel />}>
                        Отмена
                    </Button>
                    <Button onClick={handleCreateUser} variant="contained" startIcon={<Save />}>
                        Создать
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Диалог редактирования пользователя */}
            <Dialog open={editDialogOpen} onClose={handleCloseDialogs} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography component="span" variant="h6">
                        Редактирование пользователя
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, mt: 1 }} onClose={() => setError('')}>
                            {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert severity="success" sx={{ mb: 2, mt: 1 }} onClose={() => setSuccess('')}>
                            {success}
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        label="Имя пользователя"
                        value={formData.username}
                        disabled
                        margin="normal"
                        helperText="Имя пользователя нельзя изменить"
                    />
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Полное имя"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Новый пароль"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        margin="normal"
                        helperText="Оставьте пустым, если не хотите менять пароль"
                    />
                    <TextField
                        select
                        fullWidth
                        label="Роль"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        margin="normal"
                    >
                        <MenuItem value="admin">Администратор</MenuItem>
                        <MenuItem value="operator">Оператор</MenuItem>
                        <MenuItem value="executor">Исполнитель</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCloseDialogs} startIcon={<Cancel />}>
                        Отмена
                    </Button>
                    <Button onClick={handleUpdateUser} variant="contained" startIcon={<Save />}>
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserList;