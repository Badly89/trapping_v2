// src/components/Reports/ReportDetail.jsx
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    IconButton,
    ImageList,
    ImageListItem,
    ImageListItemBar,
} from '@mui/material';
import {
    Close as CloseIcon,
    Description,
    Person,
    Schedule,
    ZoomIn,
} from '@mui/icons-material';
import { formatFullDate } from '../../utils/dateUtils';

const ReportDetail = ({ open, onClose, report }) => {
    const [imageViewerOpen, setImageViewerOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleImageClick = (index) => {
        setCurrentIndex(index);
        setSelectedImage(report.photos[index]);
        setImageViewerOpen(true);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return formatFullDate(dateString);
    };

    if (!report) return null;

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Description color="success" />
                            <Typography variant="h6">Отчет #{report.id}</Typography>
                        </Box>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Текст отчета
                        </Typography>
                        <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                            {report.text}
                        </Typography>
                    </Box>

                    {report.photos && report.photos.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Фото ({report.photos.length})
                            </Typography>
                            <ImageList sx={{ width: '100%', height: 200 }} cols={3} rowHeight={164}>
                                {report.photos.map((photo, idx) => (
                                    <ImageListItem 
                                        key={idx} 
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => handleImageClick(idx)}
                                    >
                                        <img
                                            src={photo}
                                            alt={`Фото ${idx + 1}`}
                                            style={{ objectFit: 'cover', height: '100%', width: '100%' }}
                                        />
                                        <ImageListItemBar
                                            position="bottom"
                                            actionIcon={
                                                <IconButton sx={{ color: 'white' }}>
                                                    <ZoomIn />
                                                </IconButton>
                                            }
                                        />
                                    </ImageListItem>
                                ))}
                            </ImageList>
                        </Box>
                    )}

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            Создан
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Schedule fontSize="small" color="action" />
                            <Typography variant="body2">
                                {formatDate(report.created_at)}
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Закрыть</Button>
                </DialogActions>
            </Dialog>

            {/* Просмотр фото в увеличенном виде */}
            <Dialog
                open={imageViewerOpen}
                onClose={() => setImageViewerOpen(false)}
                maxWidth="xl"
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        maxWidth: '90vw',
                        maxHeight: '90vh',
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography>Фото {currentIndex + 1} из {report.photos?.length}</Typography>
                        <IconButton onClick={() => setImageViewerOpen(false)} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Report"
                            style={{
                                maxWidth: '80vw',
                                maxHeight: '80vh',
                                objectFit: 'contain',
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ReportDetail;