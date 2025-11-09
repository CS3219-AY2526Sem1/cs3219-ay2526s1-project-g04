'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import TopNavigationBar from '@/components/ui/home/top-nav';
import SideNavigationBar from '@/components/ui/home/side-nav';
import { drawerWidth } from '@/components/ui/home/side-nav';
import { getAccessToken } from '@/lib/utils/jwt';

interface LayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: LayoutProps) {
  const [appBarHeight, setAppBarHeight] = React.useState(0);

  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/accounts/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#F9FAFB',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <TopNavigationBar onHeightChange={setAppBarHeight} />
      <SideNavigationBar topOffset={appBarHeight} />

      <main
        className="flex-grow border-l overflow-y-auto border-gray-100 p-6 md:ml-[280px] md:p-10"
        style={{
          marginTop: appBarHeight,
          marginLeft: drawerWidth + 5,
        }}
      >
        {children}
      </main>
    </div>
  );
}
