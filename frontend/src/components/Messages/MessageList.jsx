// src/components/Messages/MessageList.jsx
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
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
} from '@mui/material';
import { Visibility, Refresh, FilterList, Clear } from '@mui/icons-material';
import { messages, users } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import MessageDetail from './MessageDetail';

const statusColors = {
    new: 'warning',
    processing: 'info',
    completed: 'success',
    cancelled: 'error',
    assigned: 'primary',
};

const statusLabels = {
    new: 'Новое',
    processing: 'В обработке',
    completed: 'Завершено',
    cancelled: 'Отменено',
    assigned: 'Назначено',
};

const priorityColors = {
    low: 'default',
    medium: 'info',
    high: 'warning',
    urgent: 'error',
};

const priorityLabels = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    urgent: 'Срочный',
};

const MessageList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [messageList, setMessageList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || '',
        priority: searchParams.get('priority') || '',
        assigned_to: searchParams.get('assigned_to') || '',
        has_location: searchParams.get('has_location') || '',
    });
    const { isAdmin, isOperator } = useAuth();

    useEffect(() => {
        fetchMessages();
        if (isAdmin || isOperator) {
            fetchUsers();
        }
    }, [filters]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            // Собираем параметры фильтрации
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;
            if (filters.assigned_to) params.assigned_to = filters.assigned_to;
            if (filters.has_location) params.has_location = filters.has_location === 'true';
            
            console.log('Фильтры:', params);
            const response = await messages.getAll(params);
            setMessageList(response.data || []);
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await users.getAll();
            setUsersList(response.data || []);
        } catch (error) {
            if (error.response?.status !== 403) {
                console.error('Ошибка загрузки пользователей:', error);
            }
        }
    };

    const handleViewMessage = (message) => {
        setSelectedMessage(message);
        setDialogOpen(true);
    };

    const handleApplyFilters = () => {
        // Обновляем URL параметры
        const newParams = {};
        if (filters.status) newParams.status = filters.status;
        if (filters.priority) newParams.priority = filters.priority;
        if (filters.assigned_to) newParams.assigned_to = filters.assigned_to;
        if (filters.has_location) newParams.has_location = filters.has_location;
        setSearchParams(newParams);
        fetchMessages();
    };

    const handleClearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            assigned_to: '',
            has_location: '',
        });
        setSearchParams({});
        setTimeout(() => fetchMessages(), 100);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Только что';
        if (minutes < 60) return `${minutes} мин назад`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)} ч назад`;
        return date.toLocaleDateString('ru-RU');
    };

    const getUserName = (userId) => {
        const user = usersList.find(u => u.id === userId);
        return user?.full_name || user?.username || `Пользователь #${userId}`;
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Сообщения от бота MAX
                </Typography>
                <Box>
                    <IconButton onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'default'}>
                        <FilterList />
                    </IconButton>
                    <IconButton onClick={fetchMessages} color="primary">
                        <Refresh />
                    </IconButton>
                </Box>
            </Box>

            {/* Фильтры */}
            {showFilters && (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                select
                                fullWidth
                                label="Статус"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                size="small"
                            >
                                <MenuItem value="">Все</MenuItem>
                                {Object.entries(statusLabels).map(([key, label]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                select
                                fullWidth
                                label="Приоритет"
                                value={filters.priority}
                                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                size="small"
                            >
                                <MenuItem value="">Все</MenuItem>
                                {Object.entries(priorityLabels).map(([key, label]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        
                        {(isAdmin || isOperator) && (
                            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                        
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <TextField
                                select
                                fullWidth
                                label="Геолокация"
                                value={filters.has_location}
                                onChange={(e) => setFilters({ ...filters, has_location: e.target.value })}
                                size="small"
                            >
                                <MenuItem value="">Все</MenuItem>
                                <MenuItem value="true">Есть</MenuItem>
                                <MenuItem value="false">Нет</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>
                    
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
                        <Button onClick={handleClearFilters} startIcon={<Clear />} size="small">
                            Сбросить
                        </Button>
                        <Button onClick={handleApplyFilters} variant="contained" size="small">
                            Применить
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Таблица сообщений */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Пользователь</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Текст</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Статус</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Приоритет</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Фото</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Гео</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Дата</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="center">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : messageList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        Нет сообщений
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            messageList.map((msg) => (
                                <TableRow key={msg.id} hover>
                                    <TableCell>{msg.id}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {msg.user_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            ID: {msg.user_id}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 300 }}>
                                        <Typography variant="body2">
                                            {msg.text?.substring(0, 100) || 'Нет текста'}
                                            {msg.text?.length > 100 && '...'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={statusLabels[msg.status]}
                                            color={statusColors[msg.status]}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={priorityLabels[msg.priority]}
                                            color={priorityColors[msg.priority]}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        {msg.photos?.length || 0}
                                    </TableCell>
                                    <TableCell align="center">
                                        {msg.latitude && msg.longitude ? '📍' : '—'}
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(msg.created_at)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton onClick={() => handleViewMessage(msg)} size="small">
                                            <Visibility />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Диалог деталей сообщения */}
            <MessageDetail
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                message={selectedMessage}
                onUpdate={fetchMessages}
                users={usersList}
            />
        </Box>
    );
};

export default MessageList;