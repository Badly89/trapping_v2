// src/components/Messages/ImageViewer.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    IconButton,
    Box,
    Slider,
    Typography,
} from '@mui/material';
import {
    Close as CloseIcon,
    ZoomIn,
    ZoomOut,
    RotateLeft,
    RotateRight,
    Download,
    NavigateBefore,  // <-- ДОБАВИТЬ
    NavigateNext,    // <-- ДОБАВИТЬ
} from '@mui/icons-material';

const ImageViewer = ({ open, onClose, images, initialIndex = 0 }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imageRef = useRef(null);

    useEffect(() => {
        setCurrentIndex(initialIndex);
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    }, [initialIndex, open]);

    const handleZoomIn = () => {
        setZoom(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleRotateLeft = () => {
        setRotation(prev => prev - 90);
    };

    const handleRotateRight = () => {
        setRotation(prev => prev + 90);
    };

    const handleReset = () => {
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e) => {
        if (zoom > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && zoom > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = images[currentIndex];
        link.download = `image_${currentIndex + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrev = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
        handleReset();
    };

    const handleNext = () => {
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
        handleReset();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            PaperProps={{
                sx: {
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    boxShadow: 'none',
                    maxWidth: '100vw',
                    maxHeight: '100vh',
                    margin: 0,
                    borderRadius: 0,
                }
            }}
        >
            <DialogContent sx={{ p: 0, height: '100vh', position: 'relative' }}>
                {/* Верхняя панель */}
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                }}>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                        {currentIndex + 1} / {images.length}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton onClick={handleZoomOut} sx={{ color: 'white' }}>
                            <ZoomOut />
                        </IconButton>
                        <Typography variant="body2" sx={{ color: 'white', minWidth: 50, textAlign: 'center' }}>
                            {Math.round(zoom * 100)}%
                        </Typography>
                        <IconButton onClick={handleZoomIn} sx={{ color: 'white' }}>
                            <ZoomIn />
                        </IconButton>
                        <IconButton onClick={handleRotateLeft} sx={{ color: 'white' }}>
                            <RotateLeft />
                        </IconButton>
                        <IconButton onClick={handleRotateRight} sx={{ color: 'white' }}>
                            <RotateRight />
                        </IconButton>
                        <IconButton onClick={handleDownload} sx={{ color: 'white' }}>
                            <Download />
                        </IconButton>
                        <IconButton onClick={onClose} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>

                {/* Кнопки навигации */}
                {images.length > 1 && (
                    <>
                        <IconButton
                            onClick={handlePrev}
                            sx={{
                                position: 'absolute',
                                left: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'white',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                                zIndex: 2,
                            }}
                        >
                            <NavigateBefore sx={{ fontSize: 40 }} />
                        </IconButton>
                        <IconButton
                            onClick={handleNext}
                            sx={{
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'white',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                                zIndex: 2,
                            }}
                        >
                            <NavigateNext sx={{ fontSize: 40 }} />
                        </IconButton>
                    </>
                )}

                {/* Изображение */}
                <Box
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: zoom > 1 ? 'grab' : 'default',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <img
                        ref={imageRef}
                        src={images[currentIndex]}
                        alt={`Фото ${currentIndex + 1}`}
                        style={{
                            transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${zoom})`,
                            transition: isDragging ? 'none' : 'transform 0.2s',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            cursor: zoom > 1 ? 'grab' : 'default',
                        }}
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/800?text=Image+not+available';
                        }}
                    />
                </Box>

                {/* Ползунок зума */}
                <Box sx={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 200,
                    zIndex: 2,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    borderRadius: 2,
                    p: 1,
                }}>
                    <Slider
                        value={zoom}
                        min={0.5}
                        max={3}
                        step={0.01}
                        onChange={(_, value) => setZoom(value)}
                        sx={{ color: 'white' }}
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ImageViewer;