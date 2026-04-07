// src/components/Tasks/TaskDetail.jsx
import React, { useState } from 'react';
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
    IconButton,
    Divider,
} from '@mui/material';
import {
    Close as CloseIcon,
    Assignment,
    Person,
    Schedule,
    CheckCircle,
    Pending,
} from '@mui/icons-material';
import { tasks } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatFullDate } from '../../utils/dateUtils';

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

const TaskDetail = ({ open, onClose, task, onUpdate }) => {
    const [status, setStatus] = useState(task?.status || 'pending');
    const [loading, setLoading] = useState(false);
    const { isAdmin, isOperator } = useAuth();

    React.useEffect(() => {
        if (task) {
            setStatus(task.status);
        }
    }, [task]);

    const handleUpdateStatus = async () => {
        if (status === task.status) {
            onClose();
            return;
        }
        setLoading(true);
        try {
            await tasks.update(task.id, { status });
            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error('Ошибка обновления статуса:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return formatFullDate(dateString);
    };

    if (!task) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment color="primary" />
                        <Typography variant="h6">Задача #{task.id}</Typography>
                    </Box>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Название
                        </Typography>
                        <Typography variant="h6" gutterBottom>
                            {task.title}
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Описание
                        </Typography>
                        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                            {task.description || 'Нет описания'}
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
                                label={statusLabels[task.status]}
                                color={statusColors[task.status]}
                                sx={{ mt: 1 }}
                            />
                        )}
                    </Grid>

                    <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Связанное сообщение
                        </Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 0.5, textTransform: 'none' }}
                            onClick={() => {
                                onClose();
                                // Здесь можно добавить переход к сообщению
                            }}
                        >
                            #{task.message_id}
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
                                {formatDate(task.created_at)}
                            </Typography>
                        </Box>
                    </Grid>

                    {task.completed_at && (
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Завершена
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <CheckCircle fontSize="small" color="success" />
                                <Typography variant="body2">
                                    {formatDate(task.completed_at)}
                                </Typography>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Закрыть</Button>
                {(isAdmin || isOperator) && (
                    <Button onClick={handleUpdateStatus} variant="contained" disabled={loading}>
                        Обновить статус
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default TaskDetail;