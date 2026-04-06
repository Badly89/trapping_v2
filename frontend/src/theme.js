// src/theme.js
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
        },
        secondary: {
            main: '#dc004e',
            light: '#ff4081',
            dark: '#c51162',
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
        success: {
            main: '#4caf50',
        },
        warning: {
            main: '#ff9800',
        },
        error: {
            main: '#f44336',
        },
        info: {
            main: '#2196f3',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
        },
        h5: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        // Настройка DialogTitle - убираем вложенные заголовки
        MuiDialogTitle: {
            styleOverrides: {
                root: {
                    fontSize: '1.25rem',
                    fontWeight: 500,
                    padding: '16px 24px',
                    '& h6': {
                        fontSize: '1.25rem',
                        fontWeight: 500,
                        margin: 0,
                    },
                },
            },
        },
        // Настройка Typography - предотвращаем вложенные заголовки
        MuiTypography: {
            styleOverrides: {
                root: {
                    '& h1, & h2, & h3, & h4, & h5, & h6': {
                        fontSize: 'inherit',
                        fontWeight: 'inherit',
                        margin: 0,
                    },
                },
            },
        },
        // Настройка Card
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    },
                },
            },
        },
        // Настройка Button
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                },
            },
        },
        // Настройка Table
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 600,
                    backgroundColor: '#f5f5f5',
                },
            },
        },
        // Настройка AppBar
        MuiAppBar: {
            styleOverrides: {
                root: {
                    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                },
            },
        },
    },
});