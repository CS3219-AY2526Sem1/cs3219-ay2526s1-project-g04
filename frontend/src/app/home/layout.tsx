'use client';

import * as React from 'react';
import TopNavigationBar from '@/components/ui/home/top-nav';
import SideNavigationBar from '@/components/ui/home/side-nav';
import { drawerWidth } from '@/components/ui/home/side-nav';
import ProtectedRoute from '@/components/auth/ProtectedRoute'; // 1. Import the guard
import { Box } from '@mui/material';
import { usePathname } from 'next/navigation'; // Import Box
// REMOVED: Do not import AuthProvider here

interface LayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: LayoutProps) {
  const [appBarHeight, setAppBarHeight] = React.useState(0);
  const pathname = usePathname();
  const isProfilePage = pathname === '/home/profile';

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
        <TopNavigationBar onHeightChange={setAppBarHeight} />
        {!isProfilePage && <SideNavigationBar topOffset={appBarHeight} />}

        <Box
          component="main"
          className="flex-grow border-l overflow-y-auto border-gray-100 p-6 md:p-10"
          sx={{
            marginTop: `${appBarHeight}px`,
            marginLeft: {
              md: isProfilePage ? '0px' : `${drawerWidth}px`,
            },
          }}
        >
          {children}
        </Box>
      </div>
    </ProtectedRoute>
  );
}
