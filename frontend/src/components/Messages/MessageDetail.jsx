// src/components/Messages/MessageDetail.jsx
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
    ImageListItemBar,
    Paper,
    Alert,
    Link,
} from '@mui/material';
import {
    Close as CloseIcon,
    Assignment,
    Add,
    ZoomIn,
    Description,
    LocationOn,
    Map,
} from '@mui/icons-material';
import { messages, tasks, reports } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatFullDate } from '../../utils/dateUtils';
import ReportForm from '../Reports/ReportForm';
import ImageViewer from './ImageViewer';

// Компонент для отображения карт
const MapLinks = ({ latitude, longitude, text }) => {
    const [coords, setCoords] = useState(null);

    useEffect(() => {
        // Сначала пытаемся взять координаты из полей
        if (latitude && longitude) {
            setCoords({ lat: latitude, lon: longitude });
            return;
        }
        // Если нет, пробуем извлечь из текста сообщения
        if (text) {
            // Ищем паттерн "Координаты: 56.123456, 60.123456"
            const coordPattern = /Координаты:\s*([+-]?\d+\.?\d*),\s*([+-]?\d+\.?\d*)/i;
            const match = text.match(coordPattern);
            if (match) {
                setCoords({ lat: parseFloat(match[1]), lon: parseFloat(match[2]) });
                return;
            }
            // Ищем просто числа вида 56.123456, 60.123456
            const simplePattern = /([+-]?\d+\.\d+),\s*([+-]?\d+\.\d+)/;
            const simpleMatch = text.match(simplePattern);
            if (simpleMatch) {
                setCoords({ lat: parseFloat(simpleMatch[1]), lon: parseFloat(simpleMatch[2]) });
            }
        }
    }, [latitude, longitude, text]);

    if (!coords) return null;

    const { lat, lon } = coords;
    const yandexUrl = `https://yandex.ru/maps/?pt=${lon},${lat}&z=17&l=map`;
    const gisUrl = `https://2gis.ru/search/${lat},${lon}`;

    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn fontSize="small" color="primary" />
                Местоположение
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={<Map />}
                    href={yandexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textTransform: 'none' }}
                >
                    Яндекс.Карты
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Map />}
                    href={gisUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textTransform: 'none' }}
                >
                    2ГИС
                </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Координаты: {lat.toFixed(6)}, {lon.toFixed(6)}
            </Typography>
        </Paper>
    );
};

// Компонент галереи (остаётся без изменений)
const ImageGallery = ({ photos, messageId }) => {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!photos || photos.length === 0) return null;

    const handleOpen = (index) => {
        setCurrentIndex(index);
        setViewerOpen(true);
    };

    return (
        <>
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    📷 Вложения ({photos.length})
                </Typography>
                <ImageList sx={{ width: '100%', height: 'auto' }} cols={4} rowHeight={120} gap={8}>
                    {photos.map((photo, idx) => (
                        <ImageListItem 
                            key={idx} 
                            sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden' }}
                            onClick={() => handleOpen(idx)}
                        >
                            <img
                                src={photo}
                                alt={`Фото ${idx + 1}`}
                                style={{ width: '100%', height: 120, objectFit: 'cover' }}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/120?text=No+image'; }}
                            />
                            <ImageListItemBar
                                position="bottom"
                                sx={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))' }}
                                actionIcon={
                                    <IconButton sx={{ color: 'white' }} onClick={(e) => { e.stopPropagation(); handleOpen(idx); }}>
                                        <ZoomIn />
                                    </IconButton>
                                }
                            />
                        </ImageListItem>
                    ))}
                </ImageList>
            </Box>
            <ImageViewer open={viewerOpen} onClose={() => setViewerOpen(false)} images={photos} initialIndex={currentIndex} />
        </>
    );
};

// Основной компонент MessageDetail
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
    const [reportFormOpen, setReportFormOpen] = useState(false);
    const { isAdmin, isOperator, isExecutor } = useAuth();

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
            await messages.update(message.id, { status, priority, assigned_to_id: assignedTo || null });
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
            await tasks.create({ message_id: message.id, title: taskTitle, description: taskDescription, assigned_to_id: assignedTo || null });
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

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return formatFullDate(dateString);
    };

    const getStatusColor = (status) => {
        const colors = { new: 'warning', processing: 'info', completed: 'success', assigned: 'primary', pending: 'warning', in_progress: 'info' };
        return colors[status] || 'default';
    };

    const getStatusText = (status) => {
        const texts = { new: 'Новое', processing: 'В обработке', completed: 'Завершено', assigned: 'Назначено', pending: 'Ожидает', in_progress: 'В работе', verified: 'Проверена', rejected: 'Отклонена' };
        return texts[status] || status;
    };

    if (!message) return null;

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Сообщение #{message.id}</Typography>
                        <IconButton onClick={onClose}><CloseIcon /></IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary">Отправитель</Typography>
                        <Typography variant="body1" gutterBottom>{message.user_name} (ID: {message.user_id})</Typography>

                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Текст сообщения</Typography>
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{message.text || 'Нет текста'}</Typography>

                        {/* Блок карт – добавлен */}
                        <MapLinks latitude={message.latitude} longitude={message.longitude} text={message.text} />

                        {message.photos?.length > 0 && <ImageGallery photos={message.photos} messageId={message.id} />}

                        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Дата создания</Typography>
                        <Typography variant="body2">{formatDate(message.created_at)}</Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Управление</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <TextField select fullWidth label="Статус" value={status} onChange={(e) => setStatus(e.target.value)} size="small">
                                    <MenuItem value="new">Новое</MenuItem>
                                    <MenuItem value="processing">В обработке</MenuItem>
                                    <MenuItem value="assigned">Назначено</MenuItem>
                                    <MenuItem value="completed">Завершено</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField select fullWidth label="Приоритет" value={priority} onChange={(e) => setPriority(e.target.value)} size="small">
                                    <MenuItem value="low">Низкий</MenuItem>
                                    <MenuItem value="medium">Средний</MenuItem>
                                    <MenuItem value="high">Высокий</MenuItem>
                                    <MenuItem value="urgent">Срочный</MenuItem>
                                </TextField>
                            </Grid>
                            {(isAdmin || isOperator) && (
                                <Grid item xs={12} sm={4}>
                                    <TextField select fullWidth label="Назначить" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} size="small">
                                        <MenuItem value="">Не назначено</MenuItem>
                                        {users?.filter(u => u.role === 'executor' && u.is_active).map((user) => (
                                            <MenuItem key={user.id} value={user.id}>{user.full_name} ({user.username})</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            )}
                        </Grid>
                    </Box>

                    {(isAdmin || isOperator) && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Создать задачу для этого сообщения</Typography>
                                <TextField fullWidth label="Название задачи" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} size="small" sx={{ mb: 1 }} />
                                <TextField fullWidth label="Описание" value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} multiline rows={2} size="small" sx={{ mb: 1 }} />
                                <Button variant="outlined" onClick={handleCreateTask} disabled={loading || !taskTitle} startIcon={<Add />}>Создать задачу</Button>
                            </Box>
                        </>
                    )}

                    {taskList.length > 0 && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box>
                                <Typography variant="h6" gutterBottom>Задачи по этому сообщению ({taskList.length})</Typography>
                                {taskList.map((task) => (
                                    <Paper key={task.id} sx={{ p: 2, mb: 1 }} variant="outlined">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Assignment color="primary" />
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle1">{task.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">{task.description || 'Нет описания'}</Typography>
                                                <Typography variant="caption" color="text.secondary">Создана: {formatDate(task.created_at)}</Typography>
                                            </Box>
                                            <Chip label={getStatusText(task.status)} color={getStatusColor(task.status)} size="small" />
                                        </Box>
                                    </Paper>
                                ))}
                            </Box>
                        </>
                    )}

                    {reportList.length > 0 && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box>
                                <Typography variant="h6" gutterBottom>Отчеты по этому сообщению ({reportList.length})</Typography>
                                {reportList.map((report) => (
                                    <Paper key={report.id} sx={{ p: 2, mb: 1 }} variant="outlined">
                                        <Typography variant="body2">{report.text}</Typography>
                                        {report.photos?.length > 0 && (
                                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                {report.photos.map((photo, idx) => (
                                                    <img key={idx} src={photo} alt="отчет" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                                                ))}
                                            </Box>
                                        )}
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{formatDate(report.created_at)}</Typography>
                                    </Paper>
                                ))}
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Отмена</Button>
                    <Button variant="outlined" color="info" startIcon={<Description />} onClick={() => setReportFormOpen(true)}>Создать отчет</Button>
                    <Button onClick={handleUpdateMessage} variant="contained" color="primary" disabled={loading}>Сохранить изменения</Button>
                </DialogActions>
            </Dialog>

            <ReportForm open={reportFormOpen} onClose={() => setReportFormOpen(false)} messageId={message.id} taskId={null} onSuccess={() => setReportFormOpen(false)} />
        </>
    );
};

export default MessageDetail;