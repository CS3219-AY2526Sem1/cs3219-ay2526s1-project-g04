'use client';
import { BorderColor } from '@mui/icons-material';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    cssVariables: true,
    typography: {
        fontFamily: 'var(--font-open-sans)',
        body1: { fontSize: '1rem' }
    },

    components: {
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    color: "var(--foreground)", // text color
                }
            }
        }
    }
});

export default theme;