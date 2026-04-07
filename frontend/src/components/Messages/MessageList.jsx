// src/components/Messages/MessageList.jsx
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
    Button,
    Tooltip,
    Collapse,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Grid,
} from '@mui/material';
import {
    Visibility,
    Refresh,
    FilterList,
    Clear,
    Assignment,
    Description,
    ExpandMore,
    ExpandLess,
    CheckCircle,
    Pending,
    Schedule,
} from '@mui/icons-material';
import { messages, users, tasks, reports } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import MessageDetail from './MessageDetail';
import TaskDetail from '../Tasks/TaskDetail';
import ReportDetail from '../Reports/ReportDetail';
import { formatTableDate, formatRelativeTime } from '../../utils/dateUtils';

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

const taskStatusColors = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success',
    verified: 'primary',
    rejected: 'error',
};

const taskStatusLabels = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Завершена',
    verified: 'Проверена',
    rejected: 'Отклонена',
};

const MessageList = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [messageList, setMessageList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [usersList, setUsersList] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [loadingReports, setLoadingReports] = useState({});
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    
    const [taskDialogOpen, setTaskDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || '',
        priority: searchParams.get('priority') || '',
        assigned_to: searchParams.get('assigned_to') || '',
        has_location: searchParams.get('has_location') || '',
    });
    
    const cacheRef = useRef({});
    const { isAdmin, isOperator } = useAuth();

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

    const fetchMessages = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        try {
            const params = {
                limit: rowsPerPage,
                offset: page * rowsPerPage,
            };
            if (filters.status) params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;
            if (filters.assigned_to) params.assigned_to = filters.assigned_to;
            if (filters.has_location) params.has_location = filters.has_location === 'true';
            
            const cacheKey = JSON.stringify(params);
            if (!forceRefresh && cacheRef.current[cacheKey]) {
                setMessageList(cacheRef.current[cacheKey]);
                setLoading(false);
                return;
            }
            
            const response = await messages.getAll(params);
            const messagesData = response.data || [];
            setTotalCount(response.headers['x-total-count'] || messagesData.length);
            
            // Загружаем все задачи одним запросом
            const tasksResponse = await tasks.getAll();
            const allTasks = tasksResponse.data || [];
            const tasksByMessage = {};
            allTasks.forEach(task => {
                if (!tasksByMessage[task.message_id]) {
                    tasksByMessage[task.message_id] = [];
                }
                tasksByMessage[task.message_id].push(task);
            });
            
            // Отчеты пока не загружаем - загрузим при раскрытии
            const enrichedMessages = messagesData.map(msg => ({
                ...msg,
                tasks: tasksByMessage[msg.id] || [],
                reports: null,
            }));
            
            setMessageList(enrichedMessages);
            cacheRef.current[cacheKey] = enrichedMessages;
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        } finally {
            setLoading(false);
        }
    }, [filters, page, rowsPerPage]);

    const loadReportsForMessage = async (messageId) => {
        setLoadingReports(prev => ({ ...prev, [messageId]: true }));
        try {
            const response = await reports.getByMessage(messageId);
            setMessageList(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, reports: response.data || [] }
                    : msg
            ));
        } catch (error) {
            console.error('Ошибка загрузки отчетов:', error);
            setMessageList(prev => prev.map(msg => 
                msg.id === messageId 
                    ? { ...msg, reports: [] }
                    : msg
            ));
        } finally {
            setLoadingReports(prev => ({ ...prev, [messageId]: false }));
        }
    };

    useEffect(() => {
        fetchMessages();
        if (isAdmin || isOperator) {
            fetchUsers();
        }
    }, [filters, page, rowsPerPage, fetchMessages, isAdmin, isOperator]);

    const handleViewMessage = (message) => {
        setSelectedMessage(message);
        setDialogOpen(true);
    };

    const handleApplyFilters = () => {
        const newParams = {};
        if (filters.status) newParams.status = filters.status;
        if (filters.priority) newParams.priority = filters.priority;
        if (filters.assigned_to) newParams.assigned_to = filters.assigned_to;
        if (filters.has_location) newParams.has_location = filters.has_location;
        setSearchParams(newParams);
        setPage(0);
        fetchMessages(true);
    };

    const handleClearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            assigned_to: '',
            has_location: '',
        });
        setSearchParams({});
        setPage(0);
        setTimeout(() => fetchMessages(true), 100);
    };

    const handleToggleExpand = async (messageId) => {
        const isExpanding = !expandedRows[messageId];
        setExpandedRows(prev => ({ ...prev, [messageId]: isExpanding }));
        
        if (isExpanding) {
            const message = messageList.find(m => m.id === messageId);
            if (message && message.reports === null) {
                await loadReportsForMessage(messageId);
            }
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getUserName = (userId) => {
        const user = usersList.find(u => u.id === userId);
        return user?.full_name || user?.username || `Пользователь #${userId}`;
    };

    const getTaskStatusColor = (status) => taskStatusColors[status] || 'default';
    const getTaskStatusLabel = (status) => taskStatusLabels[status] || status;

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return formatTableDate(dateString);
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
                    <IconButton onClick={() => fetchMessages(true)} color="primary">
                        <Refresh />
                    </IconButton>
                </Box>
            </Box>

            {showFilters && (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
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
                        
                        <Grid item xs={12} sm={6} md={3}>
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
                            <Grid item xs={12} sm={6} md={3}>
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
                        
                        <Grid item xs={12} sm={6} md={3}>
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

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', width: 40 }}></TableCell>
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
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : messageList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        Нет сообщений
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            messageList.map((msg) => {
                                const hasTasks = msg.tasks && msg.tasks.length > 0;
                                const hasReports = msg.reports && msg.reports !== null && msg.reports.length > 0;
                                const hasData = hasTasks || (msg.reports !== null && msg.reports.length > 0);
                                const isExpanded = expandedRows[msg.id];
                                const reportsLoading = loadingReports[msg.id];
                                
                                return (
                                    <React.Fragment key={msg.id}>
                                        <TableRow hover>
                                            <TableCell>
                                                {hasData && (
                                                    <IconButton size="small" onClick={() => handleToggleExpand(msg.id)}>
                                                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                                                    </IconButton>
                                                )}
                                            </TableCell>
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
                                                <Tooltip title={formatDate(msg.created_at)}>
                                                    <span>{formatRelativeTime(msg.created_at)}</span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton onClick={() => handleViewMessage(msg)} size="small">
                                                    <Visibility />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                        
                                        {hasData && (
                                            <TableRow>
                                                <TableCell colSpan={10} sx={{ p: 0 }}>
                                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                        <Box sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                                                            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                                                                Связанные данные
                                                            </Typography>
                                                            
                                                            {hasTasks && (
                                                                <Box sx={{ mb: 2 }}>
                                                                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Assignment fontSize="small" color="primary" />
                                                                        Задачи ({msg.tasks.length})
                                                                    </Typography>
                                                                    <List dense disablePadding>
                                                                        {msg.tasks.map((task) => (
                                                                            <ListItem 
                                                                                key={task.id} 
                                                                                sx={{ 
                                                                                    pl: 0, 
                                                                                    cursor: 'pointer',
                                                                                    '&:hover': { bgcolor: 'action.hover', borderRadius: 1 }
                                                                                }}
                                                                                onClick={() => {
                                                                                    setSelectedTask(task);
                                                                                    setTaskDialogOpen(true);
                                                                                }}
                                                                            >
                                                                                <ListItemIcon sx={{ minWidth: 32 }}>
                                                                                    {task.status === 'completed' ? 
                                                                                        <CheckCircle fontSize="small" color="success" /> : 
                                                                                        task.status === 'in_progress' ? 
                                                                                            <Schedule fontSize="small" color="info" /> : 
                                                                                            <Pending fontSize="small" color="warning" />
                                                                                    }
                                                                                </ListItemIcon>
                                                                                <ListItemText
                                                                                    primary={task.title}
                                                                                    secondary={`${task.description || 'Нет описания'} • Создана: ${formatDate(task.created_at)}`}
                                                                                    primaryTypographyProps={{ variant: 'body2' }}
                                                                                    secondaryTypographyProps={{ variant: 'caption' }}
                                                                                />
                                                                                <Chip
                                                                                    label={getTaskStatusLabel(task.status)}
                                                                                    color={getTaskStatusColor(task.status)}
                                                                                    size="small"
                                                                                />
                                                                            </ListItem>
                                                                        ))}
                                                                    </List>
                                                                </Box>
                                                            )}
                                                            
                                                            {reportsLoading ? (
                                                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                                                    <CircularProgress size={24} />
                                                                </Box>
                                                            ) : msg.reports && msg.reports.length > 0 ? (
                                                                <Box>
                                                                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                        <Description fontSize="small" color="success" />
                                                                        Отчеты ({msg.reports.length})
                                                                    </Typography>
                                                                    <List dense disablePadding>
                                                                        {msg.reports.map((report) => (
                                                                            <ListItem 
                                                                                key={report.id} 
                                                                                sx={{ 
                                                                                    pl: 0, 
                                                                                    cursor: 'pointer',
                                                                                    '&:hover': { bgcolor: 'action.hover', borderRadius: 1 }
                                                                                }}
                                                                                onClick={() => {
                                                                                    setSelectedReport(report);
                                                                                    setReportDialogOpen(true);
                                                                                }}
                                                                            >
                                                                                <ListItemIcon sx={{ minWidth: 32 }}>
                                                                                    <Description fontSize="small" color="success" />
                                                                                </ListItemIcon>
                                                                                <ListItemText
                                                                                    primary={report.text}
                                                                                    secondary={`Создан: ${formatDate(report.created_at)}${report.photos?.length ? ` • ${report.photos.length} фото` : ''}`}
                                                                                    primaryTypographyProps={{ variant: 'body2' }}
                                                                                    secondaryTypographyProps={{ variant: 'caption' }}
                                                                                />
                                                                            </ListItem>
                                                                        ))}
                                                                    </List>
                                                                </Box>
                                                            ) : msg.reports !== null && msg.reports.length === 0 && (
                                                                <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                                                                    Нет отчетов
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })
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

            <MessageDetail
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                message={selectedMessage}
                onUpdate={() => fetchMessages(true)}
                users={usersList}
            />

            <TaskDetail
                open={taskDialogOpen}
                onClose={() => {
                    setTaskDialogOpen(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
                onUpdate={() => fetchMessages(true)}
            />

            <ReportDetail
                open={reportDialogOpen}
                onClose={() => {
                    setReportDialogOpen(false);
                    setSelectedReport(null);
                }}
                report={selectedReport}
            />
        </Box>
    );
};

export default MessageList;