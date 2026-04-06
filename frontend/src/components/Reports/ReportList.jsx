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
    IconButton,
    Box,
    CircularProgress,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    ImageList,
    ImageListItem,
    Button,
} from '@mui/material';
import { Visibility, Close as CloseIcon } from '@mui/icons-material';
import { reports, messages } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ReportList = () => {
    const [reportList, setReportList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [messagesMap, setMessagesMap] = useState({});

    useEffect(() => {
        fetchAllReports();
    }, []);

    const fetchAllReports = async () => {
        setLoading(true);
        try {
            // Получаем все сообщения
            const messagesResponse = await messages.getAll();
            const allMessages = messagesResponse.data;
            
            // Собираем все отчеты
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

    const handleViewReport = (report) => {
        setSelectedReport(report);
        setDialogOpen(true);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('ru-RU');
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Отчеты по выполненным работам
            </Typography>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Сообщение</TableCell>
                            <TableCell>Пользователь</TableCell>
                            <TableCell>Текст отчета</TableCell>
                            <TableCell>Фото</TableCell>
                            <TableCell>Дата</TableCell>
                            <TableCell>Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : reportList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    Нет отчетов
                                </TableCell>
                            </TableRow>
                        ) : (
                            reportList.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell>{report.id}</TableCell>
                                    <TableCell>{report.message_id}</TableCell>
                                    <TableCell>{report.user_name}</TableCell>
                                    <TableCell sx={{ maxWidth: 300 }}>
                                        {report.text?.substring(0, 100)}
                                        {report.text?.length > 100 && '...'}
                                    </TableCell>
                                    <TableCell>{report.photos?.length || 0}</TableCell>
                                    <TableCell>{formatDate(report.created_at)}</TableCell>
                                    <TableCell>
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

            {/* Диалог деталей отчета */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                {selectedReport && (
                    <>
                        <DialogTitle>
                            Отчет #{selectedReport.id}
                        </DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                От кого
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                                {selectedReport.user_name}
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Сообщение
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                                {selectedReport.message_text || 'Нет текста'}
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Текст отчета
                            </Typography>
                            <Typography variant="body1" paragraph>
                                {selectedReport.text}
                            </Typography>
                            
                            {selectedReport.photos && selectedReport.photos.length > 0 && (
                                <>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Фото ({selectedReport.photos.length})
                                    </Typography>
                                    <ImageList sx={{ width: '100%', height: 300 }} cols={3} rowHeight={164}>
                                        {selectedReport.photos.map((photo, idx) => (
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
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                Дата создания: {formatDate(selectedReport.created_at)}
                            </Typography>
                        </DialogContent>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default ReportList;