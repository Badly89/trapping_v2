// src/components/Tasks/TaskList.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
    TextField,
    MenuItem,
    CircularProgress,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,  // Используем Grid2 вместо Grid
    Card,
    CardContent,
    Alert,
} from '@mui/material';
import { Visibility, Add, Refresh } from '@mui/icons-material';
import { tasks, messages, users } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const statusColors = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    verified: 'primary',
    rejected: 'error',
};

const statusLabels = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Завершена',
    verified: 'Проверена',
    rejected: 'Отклонена',
};

const TaskList = () => {
    const [searchParams] = useSearchParams();
    const [taskList, setTaskList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [status, setStatus] = useState('');
    const [messagesList, setMessagesList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || '',
        assigned_to: '',
    });
    const [newTask, setNewTask] = useState({
        message_id: '',
        title: '',
        description: '',
        assigned_to_id: '',
    });
    const [error, setError] = useState('');
    const { isAdmin, isOperator, user } = useAuth();

    useEffect(() => {
        fetchTasks();
        fetchMessages();
        // Загружаем пользователей только для админа или оператора
        if (isAdmin || isOperator) {
            fetchUsers();
        }
    }, [filters]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.assigned_to) params.assigned_to = filters.assigned_to;
            
            const response = await tasks.getAll(params);
            setTaskList(response.data || []);
        } catch (error) {
            console.error('Ошибка загрузки задач:', error);
            setError('Не удалось загрузить задачи');
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await messages.getAll();
            setMessagesList(response.data || []);
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await users.getAll();
            setUsersList(response.data || []);
        } catch (error) {
            // Игнорируем 403, так как это ожидаемое поведение для не-админов
            if (error.response?.status !== 403) {
                console.error('Ошибка загрузки пользователей:', error);
            }
        }
    };

    const handleViewTask = (task) => {
        setSelectedTask(task);
        setStatus(task.status);
        setDialogOpen(true);
    };

    const handleUpdateStatus = async () => {
        try {
            await tasks.update(selectedTask.id, { status });
            fetchTasks();
            setDialogOpen(false);
        } catch (error) {
            console.error('Ошибка обновления статуса:', error);
        }
    };

    const handleCreateTask = async () => {
        if (!newTask.message_id || !newTask.title) {
            setError('Заполните обязательные поля');
            return;
        }
        try {
            await tasks.create(newTask);
            setCreateDialogOpen(false);
            setNewTask({
                message_id: '',
                title: '',
                description: '',
                assigned_to_id: '',
            });
            fetchTasks();
        } catch (error) {
            console.error('Ошибка создания задачи:', error);
            setError('Ошибка создания задачи');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleString('ru-RU');
    };

    const getMessageText = (messageId) => {
        const message = messagesList.find(m => m.id === messageId);
        return message?.text?.substring(0, 50) || `Сообщение #${messageId}`;
    };

    const getUserName = (userId) => {
        const userFound = usersList.find(u => u.id === userId);
        return userFound?.full_name || userFound?.username || `Пользователь #${userId}`;
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Задачи
                </Typography>
                <Box>
                    <IconButton onClick={fetchTasks} color="primary">
                        <Refresh />
                    </IconButton>
                    {(isAdmin || isOperator) && (
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setCreateDialogOpen(true)}
                            sx={{ ml: 1 }}
                        >
                            Создать задачу
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Фильтры */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <TextField
                            select
                            fullWidth
                            label="Статус"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            size="small"
                        >
                            <MenuItem value="">Все</MenuItem>
                            <MenuItem value="pending">Ожидает</MenuItem>
                            <MenuItem value="in_progress">В работе</MenuItem>
                            <MenuItem value="completed">Завершена</MenuItem>
                        </TextField>
                    </Grid>
                    {(isAdmin || isOperator) && (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <TextField
                                select
                                fullWidth
                                label="Исполнитель"
                                value={filters.assigned_to}
                                onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })}
                                size="small"
                            >
                                <MenuItem value="">Все</MenuItem>
                                {usersList.filter(u => u.role === 'executor').map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        {user.full_name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {taskList.length === 0 && !loading ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Нет задач
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {isAdmin || isOperator ? 
                                'Создайте новую задачу, нажав кнопку "Создать задачу"' : 
                                'Задачи пока не созданы'}
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Сообщение</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Название</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Статус</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Назначена</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Создана</TableCell>
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
                            ) : (
                                taskList.map((task) => (
                                    <TableRow key={task.id} hover>
                                        <TableCell>{task.id}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {getMessageText(task.message_id)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 250 }}>
                                            <Typography variant="body2" noWrap>
                                                {task.title}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={statusLabels[task.status]}
                                                color={statusColors[task.status]}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {task.assigned_to_id ? getUserName(task.assigned_to_id) : 'Не назначена'}
                                        </TableCell>
                                        <TableCell>{formatDate(task.created_at)}</TableCell>
                                        <TableCell align="center">
                                            <IconButton onClick={() => handleViewTask(task)} size="small">
                                                <Visibility />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Диалог деталей задачи */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                {selectedTask && (
                    <>
                        <DialogTitle>
                             <Typography component="span" variant="h6">
                                    Задача: {selectedTask.title}
                             </Typography>
                        </DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Описание
                                    </Typography>
                                    <Typography variant="body1" paragraph>
                                        {selectedTask.description || 'Нет описания'}
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Статус
                                    </Typography>
                                    {(isAdmin || isOperator) ? (
                                        <TextField
                                            select
                                            fullWidth
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            size="small"
                                            sx={{ mt: 1 }}
                                        >
                                            <MenuItem value="pending">Ожидает</MenuItem>
                                            <MenuItem value="in_progress">В работе</MenuItem>
                                            <MenuItem value="completed">Завершена</MenuItem>
                                            <MenuItem value="verified">Проверена</MenuItem>
                                            <MenuItem value="rejected">Отклонена</MenuItem>
                                        </TextField>
                                    ) : (
                                        <Chip
                                            label={statusLabels[selectedTask.status]}
                                            color={statusColors[selectedTask.status]}
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Создана
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDate(selectedTask.created_at)}
                                    </Typography>
                                </Grid>
                                {selectedTask.completed_at && (
                                    <Grid size={{ xs: 12 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Завершена
                                        </Typography>
                                        <Typography variant="body2">
                                            {formatDate(selectedTask.completed_at)}
                                        </Typography>
                                    </Grid>
                                )}
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Связанное сообщение
                                    </Typography>
                                    <Typography variant="body2">
                                        #{selectedTask.message_id} - {getMessageText(selectedTask.message_id)}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)}>Закрыть</Button>
                            {(isAdmin || isOperator) && (
                                <Button onClick={handleUpdateStatus} variant="contained">
                                    Обновить статус
                                </Button>
                            )}
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Диалог создания задачи */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Typography variant="h6">Создание задачи</Typography>
                </DialogTitle>
                <DialogContent>
                    <TextField
                        select
                        fullWidth
                        label="Сообщение"
                        value={newTask.message_id}
                        onChange={(e) => setNewTask({ ...newTask, message_id: e.target.value })}
                        margin="normal"
                        required
                    >
                        <MenuItem value="">Выберите сообщение</MenuItem>
                        {messagesList.map((msg) => (
                            <MenuItem key={msg.id} value={msg.id}>
                                #{msg.id} - {msg.user_name}: {msg.text?.substring(0, 50)}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        label="Название задачи"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        margin="normal"
                        required
                    />
                    <TextField
                        fullWidth
                        label="Описание"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        margin="normal"
                        multiline
                        rows={3}
                    />
                    {(isAdmin || isOperator) && (
                        <TextField
                            select
                            fullWidth
                            label="Назначить исполнителя"
                            value={newTask.assigned_to_id}
                            onChange={(e) => setNewTask({ ...newTask, assigned_to_id: e.target.value })}
                            margin="normal"
                        >
                            <MenuItem value="">Не назначать</MenuItem>
                            {usersList.filter(u => u.role === 'executor').map((user) => (
                                <MenuItem key={user.id} value={user.id}>
                                    {user.full_name} ({user.username})
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
                    <Button onClick={handleCreateTask} variant="contained">Создать</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TaskList;