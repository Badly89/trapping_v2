// src/components/Messages/MessageDetail.jsx - с отображением геолокации
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Grid,
    TextField,
    MenuItem,
    Divider,
    IconButton,
    ImageList,
    ImageListItem,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Alert,
    Link,
} from '@mui/material';
import { formatFullDate, formatResponseTime } from '../../utils/dateUtils';
import {
    Close as CloseIcon,
    ExpandMore,
    Assignment,
    Add,
    LocationOn,
    Map,
    OpenInNew,
} from '@mui/icons-material';
import { messages, tasks, reports } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MessageDetail = ({ open, onClose, message, onUpdate, users }) => {
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskList, setTaskList] = useState([]);
    const [reportList, setReportList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { isAdmin, isOperator } = useAuth();

    useEffect(() => {
        if (message) {
            setStatus(message.status);
            setPriority(message.priority);
            setAssignedTo(message.assigned_to_id || '');
            fetchTasksForMessage();
            fetchReportsForMessage();
        }
    }, [message]);

    const fetchTasksForMessage = async () => {
        if (!message) return;
        try {
            const response = await tasks.getAll();
            const allTasks = response.data || [];
            const filteredTasks = allTasks.filter(task => task.message_id === message.id);
            setTaskList(filteredTasks);
        } catch (error) {
            console.error('Ошибка загрузки задач:', error);
        }
    };

    const fetchReportsForMessage = async () => {
        if (!message) return;
        try {
            const response = await reports.getByMessage(message.id);
            setReportList(response.data || []);
        } catch (error) {
            console.error('Ошибка загрузки отчетов:', error);
        }
    };

    const handleUpdateMessage = async () => {
        setLoading(true);
        try {
            await messages.update(message.id, {
                status,
                priority,
                assigned_to_id: assignedTo || null,
            });
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Ошибка обновления:', error);
            setError('Ошибка обновления сообщения');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async () => {
        if (!taskTitle) {
            setError('Введите название задачи');
            return;
        }
        setLoading(true);
        try {
            await tasks.create({
                message_id: message.id,
                title: taskTitle,
                description: taskDescription,
                assigned_to_id: assignedTo || null,
            });
            setTaskTitle('');
            setTaskDescription('');
            fetchTasksForMessage();
            setError('');
        } catch (error) {
            console.error('Ошибка создания задачи:', error);
            setError('Ошибка создания задачи');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            await tasks.update(taskId, { status: newStatus });
            fetchTasksForMessage();
        } catch (error) {
            console.error('Ошибка обновления статуса задачи:', error);
        }
    };

    // Генерация ссылок на карты
    const generateMapLinks = (lat, lon) => {
        return {
            yandex: `https://yandex.ru/maps/?pt=${lon},${lat}&z=17&l=map`,
            google: `https://www.google.com/maps?q=${lat},${lon}`,
            openstreet: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`
        };
    };

// Замените функцию formatDate на:
const formatDate = (dateString) => {
    if (!dateString) return '—';
    return formatFullDate(dateString);
};

    const getStatusColor = (status) => {
        const colors = {
            new: 'warning',
            processing: 'info',
            completed: 'success',
            assigned: 'primary',
            pending: 'warning',
            in_progress: 'info',
        };
        return colors[status] || 'default';
    };

    const getStatusText = (status) => {
        const texts = {
            new: 'Новое',
            processing: 'В обработке',
            completed: 'Завершено',
            assigned: 'Назначено',
            pending: 'Ожидает',
            in_progress: 'В работе',
            verified: 'Проверена',
            rejected: 'Отклонена',
        };
        return texts[status] || status;
    };

    if (!message) return null;

    const hasLocation = message.latitude && message.longitude;
    const mapLinks = hasLocation ? generateMapLinks(message.latitude, message.longitude) : null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                        Сообщение #{message.id}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {/* Информация о сообщении */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Отправитель
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                        {message.user_name} (ID: {message.user_id})
                    </Typography>
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                        Текст сообщения
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.text || 'Нет текста'}
                    </Typography>
                    
                    {/* Геолокация */}
                    {hasLocation && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                                📍 Геолокация
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <LocationOn color="primary" />
                                    <Typography variant="body2">
                                        Координаты: {message.latitude.toFixed(6)}, {message.longitude.toFixed(6)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Link href={mapLinks.yandex} target="_blank" rel="noopener noreferrer">
                                        <Button size="small" startIcon={<Map />}>
                                            Яндекс.Карты
                                        </Button>
                                    </Link>
                                    <Link href={mapLinks.google} target="_blank" rel="noopener noreferrer">
                                        <Button size="small" startIcon={<OpenInNew />}>
                                            Google Maps
                                        </Button>
                                    </Link>
                                    <Link href={mapLinks.openstreet} target="_blank" rel="noopener noreferrer">
                                        <Button size="small" startIcon={<OpenInNew />}>
                                            OpenStreetMap
                                        </Button>
                                    </Link>
                                </Box>
                            </Paper>
                        </>
                    )}
                    
                    {message.photos && message.photos.length > 0 && (
                        <>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                                Фото ({message.photos.length})
                            </Typography>
                            <ImageList sx={{ width: '100%', height: 200 }} cols={3} rowHeight={164}>
                                {message.photos.map((photo, idx) => (
                                    <ImageListItem key={idx}>
                                        <img
                                            src={photo}
                                            alt={`Фото ${idx + 1}`}
                                            style={{ objectFit: 'cover', height: '100%', width: '100%' }}
                                            loading="lazy"
                                        />
                                    </ImageListItem>
                                ))}
                            </ImageList>
                        </>
                    )}
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                        Дата создания
                    </Typography>
                    <Typography variant="body2">
                        {formatDate(message.created_at)}
                    </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                {/* Управление сообщением */}
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Управление
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                select
                                fullWidth
                                label="Статус"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                size="small"
                            >
                                <MenuItem value="new">Новое</MenuItem>
                                <MenuItem value="processing">В обработке</MenuItem>
                                <MenuItem value="assigned">Назначено</MenuItem>
                                <MenuItem value="completed">Завершено</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                select
                                fullWidth
                                label="Приоритет"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                size="small"
                            >
                                <MenuItem value="low">Низкий</MenuItem>
                                <MenuItem value="medium">Средний</MenuItem>
                                <MenuItem value="high">Высокий</MenuItem>
                                <MenuItem value="urgent">Срочный</MenuItem>
                            </TextField>
                        </Grid>
                        {(isAdmin || isOperator) && (
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Назначить"
                                    value={assignedTo}
                                    onChange={(e) => setAssignedTo(e.target.value)}
                                    size="small"
                                >
                                    <MenuItem value="">Не назначено</MenuItem>
                                    {users?.filter(u => u.role === 'executor' && u.is_active).map((user) => (
                                        <MenuItem key={user.id} value={user.id}>
                                            {user.full_name} ({user.username})
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        )}
                    </Grid>
                </Box>
                
                {/* Создание задачи */}
                {(isAdmin || isOperator) && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Создать задачу для этого сообщения
                            </Typography>
                            <TextField
                                fullWidth
                                label="Название задачи"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                size="small"
                                sx={{ mb: 1 }}
                            />
                            <TextField
                                fullWidth
                                label="Описание"
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                multiline
                                rows={2}
                                size="small"
                                sx={{ mb: 1 }}
                            />
                            <Button 
                                variant="outlined" 
                                onClick={handleCreateTask}
                                disabled={loading || !taskTitle}
                                startIcon={<Add />}
                            >
                                Создать задачу
                            </Button>
                        </Box>
                    </>
                )}
                
                {/* Список задач */}
                {taskList.length > 0 && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Задачи по этому сообщению ({taskList.length})
                            </Typography>
                            {taskList.map((task) => (
                                <Accordion key={task.id} sx={{ mb: 1 }}>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                            <Assignment color="primary" />
                                            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                                                {task.title}
                                            </Typography>
                                            <Chip
                                                label={getStatusText(task.status)}
                                                color={getStatusColor(task.status)}
                                                size="small"
                                            />
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            {task.description || 'Нет описания'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Создана: {formatDate(task.created_at)}
                                        </Typography>
                                        {(isAdmin || isOperator) && task.status !== 'completed' && (
                                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                                >
                                                    В работу
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="success"
                                                    onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                                >
                                                    Завершить
                                                </Button>
                                            </Box>
                                        )}
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Box>
                    </>
                )}
                
                {/* Список отчетов */}
                {reportList.length > 0 && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Отчеты по этому сообщению ({reportList.length})
                            </Typography>
                            {reportList.map((report) => (
                                <Paper key={report.id} sx={{ p: 2, mb: 1 }} variant="outlined">
                                    <Typography variant="body2">
                                        {report.text}
                                    </Typography>
                                    {report.photos && report.photos.length > 0 && (
                                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {report.photos.map((photo, idx) => (
                                                <img
                                                    key={idx}
                                                    src={photo}
                                                    alt={`Отчет фото ${idx + 1}`}
                                                    style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        {formatDate(report.created_at)}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    </>
                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose}>Отмена</Button>
                <Button 
                    onClick={handleUpdateMessage} 
                    variant="contained" 
                    color="primary"
                    disabled={loading}
                >
                    Сохранить изменения
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MessageDetail;