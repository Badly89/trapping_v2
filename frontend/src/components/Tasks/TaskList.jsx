// src/components/Tasks/TaskList.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
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
    Grid,
    Card,
    CardContent,
    Alert,
    Tooltip,
    Avatar,
    Divider,
} from '@mui/material';
import {
    Visibility,
    Add,
    Refresh,
    Assignment,
    Person,
    Schedule,
    CheckCircle,
    Pending,
} from '@mui/icons-material';
import { tasks, messages, users } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatFullDate, formatRelativeTime, formatTableDate } from '../../utils/dateUtils';

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

const statusIcons = {
    pending: <Pending fontSize="small" />,
    in_progress: <Schedule fontSize="small" />,
    completed: <CheckCircle fontSize="small" />,
};

const TaskList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [taskList, setTaskList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [status, setStatus] = useState('');
    const [messagesList, setMessagesList] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
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
    
    const cacheRef = useRef({});
    const { isAdmin, isOperator, user } = useAuth();

    const fetchMessages = useCallback(async () => {
        try {
            const response = await messages.getAll();
            setMessagesList(response.data || []);
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await users.getAll();
            setUsersList(response.data || []);
        } catch (error) {
            if (error.response?.status !== 403) {
                console.error('Ошибка загрузки пользователей:', error);
            }
        }
    }, []);

    const fetchTasks = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        try {
            const params = {
                limit: rowsPerPage,
                offset: page * rowsPerPage,
            };
            if (filters.status) params.status = filters.status;
            if (filters.assigned_to) params.assigned_to = filters.assigned_to;
            
            const cacheKey = JSON.stringify(params);
            if (!forceRefresh && cacheRef.current[cacheKey]) {
                setTaskList(cacheRef.current[cacheKey]);
                setLoading(false);
                return;
            }
            
            const response = await tasks.getAll(params);
            const tasksData = response.data || [];
            setTotalCount(response.headers['x-total-count'] || tasksData.length);
            
            setTaskList(tasksData);
            cacheRef.current[cacheKey] = tasksData;
        } catch (error) {
            console.error('Ошибка загрузки задач:', error);
            setError('Не удалось загрузить задачи');
        } finally {
            setLoading(false);
        }
    }, [filters, page, rowsPerPage]);

    useEffect(() => {
        fetchTasks();
        fetchMessages();
        if (isAdmin || isOperator) {
            fetchUsers();
        }
    }, [fetchTasks, fetchMessages, fetchUsers, filters, page, rowsPerPage, isAdmin, isOperator]);

    const handleViewTask = (task) => {
        setSelectedTask(task);
        setStatus(task.status);
        setDialogOpen(true);
    };

    const handleUpdateStatus = async () => {
        try {
            await tasks.update(selectedTask.id, { status });
            fetchTasks(true);
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
            fetchTasks(true);
        } catch (error) {
            console.error('Ошибка создания задачи:', error);
            setError('Ошибка создания задачи');
        }
    };

    const handleApplyFilters = () => {
        const newParams = {};
        if (filters.status) newParams.status = filters.status;
        if (filters.assigned_to) newParams.assigned_to = filters.assigned_to;
        setSearchParams(newParams);
        setPage(0);
        fetchTasks(true);
    };

    const handleClearFilters = () => {
        setFilters({
            status: '',
            assigned_to: '',
        });
        setSearchParams({});
        setPage(0);
        setTimeout(() => fetchTasks(true), 100);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return formatTableDate(dateString);
    };

    const formatFullDateDetail = (dateString) => {
        if (!dateString) return '—';
        return formatFullDate(dateString);
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
                    <IconButton onClick={() => fetchTasks(true)} color="primary">
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
                    <Grid item xs={12} sm={6} md={4}>
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
                        <Grid item xs={12} sm={6} md={4}>
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
                    <Grid item xs={12} sm={6} md={4}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
                            <Button onClick={handleClearFilters} variant="outlined" size="small">
                                Сбросить
                            </Button>
                            <Button onClick={handleApplyFilters} variant="contained" size="small">
                                Применить
                            </Button>
                        </Box>
                    </Grid>
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
                        <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
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
                                            <Tooltip title={getMessageText(task.message_id)}>
                                                <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    #{task.message_id}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 250 }}>
                                            <Tooltip title={task.title}>
                                                <Typography variant="body2" noWrap>
                                                    {task.title}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={statusIcons[task.status]}
                                                label={statusLabels[task.status]}
                                                color={statusColors[task.status]}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {task.assigned_to_id ? getUserName(task.assigned_to_id) : 'Не назначена'}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={formatFullDateDetail(task.created_at)}>
                                                <span>{formatDate(task.created_at)}</span>
                                            </Tooltip>
                                        </TableCell>
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
                    <TablePagination
                        rowsPerPageOptions={[10, 20, 50, 100]}
                        component="div"
                        count={totalCount}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Строк на странице:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
                    />
                </TableContainer>
            )}

            {/* Диалог деталей задачи */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                {selectedTask && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Assignment color="primary" />
                                <Typography variant="h6">Задача #{selectedTask.id}</Typography>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Название
                                    </Typography>
                                    <Typography variant="h6" gutterBottom>
                                        {selectedTask.title}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Описание
                                    </Typography>
                                    <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedTask.description || 'Нет описания'}
                                    </Typography>
                                </Grid>

                                <Divider sx={{ my: 1, width: '100%' }} />

                                <Grid item xs={12}>
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
                                            icon={statusIcons[selectedTask.status]}
                                            label={statusLabels[selectedTask.status]}
                                            color={statusColors[selectedTask.status]}
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Исполнитель
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Person fontSize="small" color="action" />
                                        <Typography variant="body2">
                                            {selectedTask.assigned_to_id 
                                                ? getUserName(selectedTask.assigned_to_id) 
                                                : 'Не назначен'}
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Связанное сообщение
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        sx={{ mt: 0.5, textTransform: 'none' }}
                                        onClick={() => window.location.href = `/messages`}
                                    >
                                        #{selectedTask.message_id} - {getMessageText(selectedTask.message_id)}
                                    </Button>
                                </Grid>

                                <Divider sx={{ my: 1, width: '100%' }} />

                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Создана
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <Schedule fontSize="small" color="action" />
                                        <Typography variant="body2">
                                            {formatFullDateDetail(selectedTask.created_at)}
                                        </Typography>
                                    </Box>
                                </Grid>
                                {selectedTask.completed_at && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Завершена
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <CheckCircle fontSize="small" color="success" />
                                            <Typography variant="body2">
                                                {formatFullDateDetail(selectedTask.completed_at)}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
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