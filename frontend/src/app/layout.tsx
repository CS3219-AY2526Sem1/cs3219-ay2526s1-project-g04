import type { Metadata } from 'next';
import { openSans, sourceCodePro } from '@/styles/fonts';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/styles/theme';
import '@/styles/globals.css';
import { SnackbarProvider } from '@/components/ui/notifContext';

import * as React from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export const metadata: Metadata = {
  title: 'PeerPrep',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body
        className={`${openSans.variable} ${sourceCodePro.variable} antialiased`}
        style={{ height: '100%', margin: 0 }}
      >
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <AuthProvider>
              <React.Suspense
                fallback={
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100vh',
                    }}
                  >
                    <CircularProgress />
                  </Box>
                }
              >
                {children}
              </React.Suspense>
            </AuthProvider>
          </ThemeProvider>
          <ThemeProvider theme={theme}>
            <SnackbarProvider>{children}</SnackbarProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
