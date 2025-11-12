'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: 'var(--font-open-sans)',
    body1: { fontSize: '1rem' },
  },

  palette: {
    mode: 'light',
  },

  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: 'var(--foreground)', // text color
        },
      },
    },
  },
});

export default theme;
