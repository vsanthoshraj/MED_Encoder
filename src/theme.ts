import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#D0BCFF', // Material 3 M3 deep violet primary
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
    },
    typography: {
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
        h1: { fontWeight: 600, fontSize: '2.5rem' },
        h5: { fontWeight: 500 },
    },
    shape: {
        borderRadius: 16,
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
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                },
            },
        },
    },
});
