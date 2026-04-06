// src/components/Reports/ReportList.jsx
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
    ImageList,
    ImageListItem,
    ImageListItemBar,
    Tooltip,
    Tabs,
    Tab,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
} from '@mui/material';
import {
    Visibility,
    Add,
    Refresh,
    Close as CloseIcon,
    ZoomIn,
    Download,
    FilterList,
    Clear,
    PictureAsPdf,
    Description,
    Assignment,
} from '@mui/icons-material';
import { reports, messages, tasks } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatFullDate, formatRelativeTime } from '../../utils/dateUtils';


// Компонент для просмотра фото в отчете
const ReportImageGallery = ({ photos, reportId }) => {
    const [open, setOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!photos || photos.length === 0) return null;

    const handleOpen = (index) => {
        setCurrentIndex(index);
        setSelectedImage(photos[index]);
        setOpen(true);
    };

    const handlePrev = () => {
        const newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
        setCurrentIndex(newIndex);
        setSelectedImage(photos[newIndex]);
    };

    const handleNext = () => {
        const newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
        setCurrentIndex(newIndex);
        setSelectedImage(photos[newIndex]);
    };

    const handleDownload = () => {
        if (selectedImage) {
            const link = document.createElement('a');
            link.href = selectedImage;
            link.download = `report_${reportId}_photo_${currentIndex + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {photos.map((photo, idx) => (
                    <Box
                        key={idx}
                        sx={{
                            width: 80,
                            height: 80,
                            cursor: 'pointer',
                            borderRadius: 1,
                            overflow: 'hidden',
                            border: '1px solid #e0e0e0',
                            position: 'relative',
                            '&:hover': {
                                transform: 'scale(1.05)',
                                transition: 'transform 0.2s',
                            }
                        }}
                        onClick={() => handleOpen(idx)}
                    >
                        <img
                            src={photo}
                            alt={`Фото отчета ${idx + 1}`}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/80?text=No+image';
                            }}
                        />
                        <IconButton
                            sx={{
                                position: 'absolute',
                                bottom: 2,
                                right: 2,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                padding: 0.5,
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                            }}
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpen(idx);
                            }}
                        >
                            <ZoomIn sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>
                ))}
            </Box>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Фото {currentIndex + 1} из {photos.length}</Typography>
                    <Box>
                        <IconButton onClick={handleDownload} sx={{ color: 'white' }}>
                            <Download />
                        </IconButton>
                        <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ position: 'relative' }}>
                        {photos.length > 1 && (
                            <IconButton
                                onClick={handlePrev}
                                sx={{
                                    position: 'absolute',
                                    left: -60,
                                    top: '50%',
                                    color: 'white',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                }}
                            >
                                ◀
                            </IconButton>
                        )}
                        <img
                            src={selectedImage}
                            alt="Report"
                            style={{
                                maxWidth: '80vw',
                                maxHeight: '80vh',
                                objectFit: 'contain',
                            }}
                        />
                        {photos.length > 1 && (
                            <IconButton
                                onClick={handleNext}
                                sx={{
                                    position: 'absolute',
                                    right: -60,
                                    top: '50%',
                                    color: 'white',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                }}
                            >
                                ▶
                            </IconButton>
                        )}
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Компонент формы создания отчета
const ReportForm = ({ open, onClose, messageId, taskId, onSuccess }) => {
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewUrls, setPreviewUrls] = useState([]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
        
        // Создаем превью
        const urls = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);
    };

    const handleSubmit = async () => {
    if (!text.trim()) {
        setError('Введите текст отчета');
        return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('text', text);
    formData.append('message_id', messageId);
    if (taskId) formData.append('task_id', taskId);
    files.forEach(file => formData.append('files', file));

    // Добавьте отладочный вывод
    console.log('Отправка отчета:', {
        text,
        message_id: messageId,
        task_id: taskId,
        files_count: files.length
    });

    try {
        const response = await reports.create(formData);
        console.log('Ответ сервера:', response.data);
        onSuccess();
        handleClose();
    } catch (error) {
        console.error('Ошибка создания отчета:', error.response?.data || error.message);
        setError(error.response?.data?.detail || 'Ошибка создания отчета');
    } finally {
        setLoading(false);
    }
};

    const handleClose = () => {
        setText('');
        setFiles([]);
        setPreviewUrls([]);
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Typography variant="h6">Создание отчета</Typography>
            </DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Текст отчета"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    margin="normal"
                    required
                />
                <Button
                    variant="outlined"
                    component="label"
                    startIcon={<Add />}
                    sx={{ mt: 2 }}
                >
                    Добавить фото
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        hidden
                        onChange={handleFileChange}
                    />
                </Button>
                {previewUrls.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {previewUrls.map((url, idx) => (
                            <Box key={idx} sx={{ position: 'relative' }}>
                                <img
                                    src={url}
                                    alt={`Preview ${idx + 1}`}
                                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                                />
                                <IconButton
                                    size="small"
                                    sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'white' }}
                                    onClick={() => {
                                        setFiles(files.filter((_, i) => i !== idx));
                                        setPreviewUrls(previewUrls.filter((_, i) => i !== idx));
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                        ))}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Отмена</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Создать отчет'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Основной компонент ReportList
const ReportList = () => {
    const [reportList, setReportList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [messagesList, setMessagesList] = useState([]);
    const [tasksList, setTasksList] = useState([]);
    const [filterMessageId, setFilterMessageId] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const { isAdmin, isOperator, isExecutor } = useAuth();

    useEffect(() => {
        fetchAllReports();
        fetchMessages();
        if (isAdmin || isOperator) {
            fetchTasks();
        }
    }, []);

    const fetchAllReports = async () => {
        setLoading(true);
        try {
            const messagesResponse = await messages.getAll();
            const allMessages = messagesResponse.data || [];
            
            const allReports = [];
            for (const msg of allMessages) {
                try {
                    const response = await reports.getByMessage(msg.id);
                    if (response.data && response.data.length > 0) {
                        response.data.forEach(report => {
                            allReports.push({
                                ...report,
                                message_text: msg.text,
                                user_name: msg.user_name,
                                message_id: msg.id,
                            });
                        });
                    }
                } catch (error) {
                    console.error(`Ошибка загрузки отчетов для сообщения ${msg.id}:`, error);
                }
            }
            setReportList(allReports);
        } catch (error) {
            console.error('Ошибка загрузки отчетов:', error);
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

    const fetchTasks = async () => {
        try {
            const response = await tasks.getAll();
            setTasksList(response.data || []);
        } catch (error) {
            console.error('Ошибка загрузки задач:', error);
        }
    };

    const handleViewReport = (report) => {
        setSelectedReport(report);
        setDialogOpen(true);
    };

    const handleCreateReport = (messageId, taskId = null) => {
        setSelectedMessageId(messageId);
        setSelectedTaskId(taskId);
        setFormOpen(true);
    };

    const handleFormSuccess = () => {
        fetchAllReports();
        setFormOpen(false);
    };

    const filteredReports = filterMessageId
        ? reportList.filter(r => r.message_id === parseInt(filterMessageId))
        : reportList;

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return formatFullDate(dateString);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Отчеты по выполненным работам
                </Typography>
                <Box>
                    <IconButton onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'default'}>
                        <FilterList />
                    </IconButton>
                    <IconButton onClick={fetchAllReports} color="primary">
                        <Refresh />
                    </IconButton>
                </Box>
            </Box>

            {showFilters && (
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Фильтр по сообщению</InputLabel>
                                <Select
                                    value={filterMessageId}
                                    onChange={(e) => setFilterMessageId(e.target.value)}
                                    input={<OutlinedInput label="Фильтр по сообщению" />}
                                >
                                    <MenuItem value="">Все сообщения</MenuItem>
                                    {messagesList.map((msg) => (
                                        <MenuItem key={msg.id} value={msg.id}>
                                            #{msg.id} - {msg.user_name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item>
                            <Button
                                onClick={() => setFilterMessageId('')}
                                startIcon={<Clear />}
                                size="small"
                            >
                                Сбросить
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {reportList.length === 0 && !loading ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Description sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Нет отчетов
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Отчеты появятся после выполнения задач
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
                                <TableCell sx={{ fontWeight: 'bold' }}>Пользователь</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Текст отчета</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Фото</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Дата</TableCell>
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
                            ) : filteredReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            Нет отчетов для выбранного фильтра
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReports.map((report) => (
                                    <TableRow key={report.id} hover>
                                        <TableCell>{report.id}</TableCell>
                                        <TableCell>
                                            <Tooltip title={report.message_text || 'Нет текста'}>
                                                <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    #{report.message_id}
                                                </Typography>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{report.user_name}</TableCell>
                                        <TableCell sx={{ maxWidth: 300 }}>
                                            <Typography variant="body2">
                                                {report.text?.substring(0, 100)}
                                                {report.text?.length > 100 && '...'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {report.photos?.length > 0 ? (
                                                <Chip
                                                    label={`${report.photos.length} фото`}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip title={formatDate(report.created_at)}>
                                                <span>{formatRelativeTime(report.created_at)}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton onClick={() => handleViewReport(report)} size="small">
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

            {/* Диалог деталей отчета */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                {selectedReport && (
                    <>
                        <DialogTitle>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="h6">
                                    Отчет #{selectedReport.id}
                                </Typography>
                                <IconButton onClick={() => setDialogOpen(false)}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        От кого
                                    </Typography>
                                    <Typography variant="body1" gutterBottom>
                                        {selectedReport.user_name}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Сообщение
                                    </Typography>
                                    <Typography variant="body1" gutterBottom>
                                        #{selectedReport.message_id}: {selectedReport.message_text || 'Нет текста'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Текст отчета
                                    </Typography>
                                    <Typography variant="body1" paragraph>
                                        {selectedReport.text}
                                    </Typography>
                                </Grid>
                                {selectedReport.photos && selectedReport.photos.length > 0 && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            Фото ({selectedReport.photos.length})
                                        </Typography>
                                        <ReportImageGallery photos={selectedReport.photos} reportId={selectedReport.id} />
                                    </Grid>
                                )}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Дата создания
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatDate(selectedReport.created_at)}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogOpen(false)}>Закрыть</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Форма создания отчета */}
            <ReportForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                messageId={selectedMessageId}
                taskId={selectedTaskId}
                onSuccess={handleFormSuccess}
            />
        </Box>
    );
};

export default ReportList;