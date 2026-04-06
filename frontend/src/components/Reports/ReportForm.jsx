// src/components/Reports/ReportForm.jsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    IconButton,
    Alert,
    CircularProgress,
    
} from '@mui/material';
import { Add, Close as CloseIcon } from '@mui/icons-material';
import { reports } from '../../services/api';

const ReportForm = ({ open, onClose, messageId, taskId = null, onSuccess }) => {
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewUrls, setPreviewUrls] = useState([]);

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
        const urls = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);
    };

    const handleRemoveFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
        setPreviewUrls(previewUrls.filter((_, i) => i !== index));
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

        try {
            const response = await reports.create(formData);
            console.log('Отчет создан:', response.data);
            if (onSuccess) onSuccess(response.data);
            handleClose();
        } catch (err) {
            console.error('Ошибка создания отчета:', err);
            setError(err.response?.data?.detail || 'Ошибка создания отчета');
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
               Создание отчета
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
                                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
                                />
                                <IconButton
                                    size="small"
                                    sx={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'white' }}
                                    onClick={() => handleRemoveFile(idx)}
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

export default ReportForm;