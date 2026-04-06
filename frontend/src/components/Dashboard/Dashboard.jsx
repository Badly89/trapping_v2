// src/components/Dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/dateUtils';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    CircularProgress,
    LinearProgress,
    IconButton,
    Tooltip,
    Chip,
    Avatar,
    useTheme,
} from '@mui/material';
import {
    Message as MessageIcon,
    Assignment as TaskIcon,
    CheckCircle as CompletedIcon,
    Pending as PendingIcon,
    TrendingUp,
    Warning,
    Schedule,
    People,
    Description,
    ArrowForward,
} from '@mui/icons-material';
import { messages, tasks } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const StatCard = ({ title, value, icon, color, onClick, trend, subtitle, loading }) => {
    const theme = useTheme();

    return (
        <Card 
            sx={{ 
                height: '100%', 
                borderRadius: 2,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': onClick ? {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                } : {},
            }}
            onClick={onClick}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
                        {icon}
                    </Avatar>
                    <IconButton 
                        size="small" 
                        sx={{ opacity: 0.7 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onClick) onClick();
                        }}
                    >
                        <ArrowForward />
                    </IconButton>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {title}
                </Typography>
                
                {loading ? (
                    <LinearProgress sx={{ my: 1 }} />
                ) : (
                    <Typography variant="h3" component="div" fontWeight="bold">
                        {value || 0}
                    </Typography>
                )}
                
                {trend !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                        <TrendingUp fontSize="small" sx={{ color: trend > 0 ? 'success.main' : 'error.main' }} />
                        <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'}>
                            {trend > 0 ? '+' : ''}{trend}%
                        </Typography>
                    </Box>
                )}
                
                {subtitle && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentMessages, setRecentMessages] = useState([]);
    const [recentTasks, setRecentTasks] = useState([]);

    useEffect(() => {
        fetchStats();
        fetchRecentData();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await messages.getStatistics();
            setStats(response.data);
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentData = async () => {
        try {
            const [messagesRes, tasksRes] = await Promise.all([
                messages.getAll({ limit: 5 }),
                tasks.getAll({ limit: 5 })
            ]);
            setRecentMessages(messagesRes.data || []);
            setRecentTasks(tasksRes.data || []);
        } catch (error) {
            console.error('Ошибка загрузки последних данных:', error);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            new: 'warning',
            processing: 'info',
            completed: 'success',
            assigned: 'primary',
        };
        return colors[status] || 'default';
    };

    const getStatusText = (status) => {
        const texts = {
            new: 'Новое',
            processing: 'В обработке',
            completed: 'Завершено',
            assigned: 'Назначено',
        };
        return texts[status] || status;
    };

        const formatDate = (dateString) => {
            if (!dateString) return '—';
            return formatRelativeTime(dateString);
        };

    // Статистика для карточек
    const messageStats = [
        {
            title: 'Всего сообщений',
            value: stats?.messages?.total || 0,
            icon: <MessageIcon sx={{ fontSize: 28 }} />,
            color: theme.palette.primary.main,
            path: '/messages',
            trend: 12,
        },
        {
            title: 'Новые сообщения',
            value: stats?.messages?.new || 0,
            icon: <PendingIcon sx={{ fontSize: 28 }} />,
            color: theme.palette.warning.main,
            path: '/messages?status=new',
            trend: -5,
        },
        {
            title: 'В обработке',
            value: stats?.messages?.processing || 0,
            icon: <Schedule sx={{ fontSize: 28 }} />,
            color: theme.palette.info.main,
            path: '/messages?status=processing',
        },
        {
            title: 'Завершено',
            value: stats?.messages?.completed || 0,
            icon: <CompletedIcon sx={{ fontSize: 28 }} />,
            color: theme.palette.success.main,
            path: '/messages?status=completed',
            trend: 8,
        },
    ];

    const taskStats = [
        {
            title: 'Всего задач',
            value: stats?.tasks?.total || 0,
            icon: <TaskIcon sx={{ fontSize: 28 }} />,
            color: theme.palette.secondary.main,
            path: '/tasks',
        },
        {
            title: 'В работе',
            value: stats?.tasks?.in_progress || 0,
            icon: <Schedule sx={{ fontSize: 28 }} />,
            color: theme.palette.info.main,
            path: '/tasks?status=in_progress',
        },
        {
            title: 'Завершено',
            value: stats?.tasks?.completed || 0,
            icon: <CompletedIcon sx={{ fontSize: 28 }} />,
            color: theme.palette.success.main,
            path: '/tasks?status=completed',
        },
    ];

    return (
        <Box>
            {/* Приветствие */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                    Добро пожаловать, {user?.username}!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Вот сводка активности по вашей CRM системе
                </Typography>
            </Box>

            {/* Статистика сообщений */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 3 }}>
                📊 Статистика сообщений
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {messageStats.map((stat, index) => (
                    <Grid item xs={12} sm={3} md={6} key={index}>
                        <StatCard
                            title={stat.title}
                            value={stat.value}
                            icon={stat.icon}
                            color={stat.color}
                            onClick={() => navigate(stat.path)}
                            loading={loading}
                            trend={stat.trend}
                        />
                    </Grid>
                ))}
            </Grid>

            {/* Статистика задач */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                ✅ Статистика задач
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {taskStats.map((stat, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <StatCard
                            title={stat.title}
                            value={stat.value}
                            icon={stat.icon}
                            color={stat.color}
                            onClick={() => navigate(stat.path)}
                            loading={loading}
                        />
                    </Grid>
                ))}
            </Grid>

            {/* Последние сообщения */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                📨 Последние сообщения
            </Typography>
            <Card sx={{ mb: 4, borderRadius: 2 }}>
                <CardContent>
                    {recentMessages.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                            Нет сообщений
                        </Typography>
                    ) : (
                        recentMessages.map((msg, idx) => (
                            <Box
                                key={msg.id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    py: 1.5,
                                    borderBottom: idx < recentMessages.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: theme.palette.action.hover },
                                    px: 1,
                                    borderRadius: 1,
                                }}
                                onClick={() => navigate(`/messages`)}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: getStatusColor(msg.status) + '.main', width: 40, height: 40 }}>
                                        <MessageIcon sx={{ fontSize: 20 }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            {msg.user_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {msg.text?.substring(0, 60) || 'Нет текста'}
                                            {msg.text?.length > 60 && '...'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Chip
                                        label={getStatusText(msg.status)}
                                        color={getStatusColor(msg.status)}
                                        size="small"
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        {formatDate(msg.created_at)}
                                    </Typography>
                                </Box>
                            </Box>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Последние задачи */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                📋 Последние задачи
            </Typography>
            <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                    {recentTasks.length === 0 ? (
                        <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                            Нет задач
                        </Typography>
                    ) : (
                        recentTasks.map((task, idx) => (
                            <Box
                                key={task.id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    py: 1.5,
                                    borderBottom: idx < recentTasks.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: theme.palette.action.hover },
                                    px: 1,
                                    borderRadius: 1,
                                }}
                                onClick={() => navigate(`/tasks`)}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: theme.palette.secondary.main, width: 40, height: 40 }}>
                                        <TaskIcon sx={{ fontSize: 20 }} />
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            {task.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {task.description?.substring(0, 50) || 'Нет описания'}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Chip
                                        label={task.status === 'pending' ? 'Ожидает' : 
                                               task.status === 'in_progress' ? 'В работе' : 
                                               task.status === 'completed' ? 'Завершена' : task.status}
                                        size="small"
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                        {formatDate(task.created_at)}
                                    </Typography>
                                </Box>
                            </Box>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Быстрые действия */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                ⚡ Быстрые действия
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card 
                        sx={{ 
                            cursor: 'pointer', 
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'translateY(-2px)' }
                        }}
                        onClick={() => navigate('/messages')}
                    >
                        <CardContent sx={{ textAlign: 'center' }}>
                            <MessageIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} />
                            <Typography variant="body2" fontWeight="medium">
                                Просмотр сообщений
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card 
                        sx={{ 
                            cursor: 'pointer', 
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'translateY(-2px)' }
                        }}
                        onClick={() => navigate('/tasks')}
                    >
                        <CardContent sx={{ textAlign: 'center' }}>
                            <TaskIcon sx={{ fontSize: 40, color: theme.palette.secondary.main, mb: 1 }} />
                            <Typography variant="body2" fontWeight="medium">
                                Управление задачами
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card 
                        sx={{ 
                            cursor: 'pointer', 
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'translateY(-2px)' }
                        }}
                        onClick={() => navigate('/reports')}
                    >
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Description sx={{ fontSize: 40, color: theme.palette.info.main, mb: 1 }} />
                            <Typography variant="body2" fontWeight="medium">
                                Просмотр отчетов
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card 
                        sx={{ 
                            cursor: 'pointer', 
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'translateY(-2px)' }
                        }}
                        onClick={() => navigate('/settings')}
                    >
                        <CardContent sx={{ textAlign: 'center' }}>
                            <People sx={{ fontSize: 40, color: theme.palette.success.main, mb: 1 }} />
                            <Typography variant="body2" fontWeight="medium">
                                Настройки профиля
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;