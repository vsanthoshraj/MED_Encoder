import { createTheme, type ThemeOptions } from '@mui/material/styles';

const getDesignTokens = (mode: 'light' | 'dark'): ThemeOptions => ({
    palette: {
        mode,
        ...(mode === 'light'
            ? {
                // Light mode
                primary: {
                    main: '#6750A4',
                },
                secondary: {
                    main: '#625B71',
                },
                background: {
                    default: '#FFFBFE',
                    paper: '#FFFFFF',
                },
                text: {
                    primary: '#1C1B1F',
                    secondary: '#49454F',
                },
            }
            : {
                // Dark mode
                primary: {
                    main: '#D0BCFF',
                },
                secondary: {
                    main: '#CCC2DC',
                },
                background: {
                    default: '#1C1B1F',
                    paper: '#2B2930',
                },
                text: {
                    primary: '#E6E1E5',
                    secondary: '#CAC4D0',
                },
            }),
    },
    typography: {
        fontFamily: 'Outfit, Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
        h4: { fontWeight: 800, letterSpacing: -1 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 700 },
    },
    shape: {
        borderRadius: 24,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    padding: '12px 24px',
                    fontWeight: 600,
                    borderRadius: 24,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: mode === 'dark'
                        ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))'
                        : 'none',
                    border: mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.05)',
                    boxShadow: mode === 'light' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
});

export const getAppTheme = (mode: 'light' | 'dark') => createTheme(getDesignTokens(mode));
