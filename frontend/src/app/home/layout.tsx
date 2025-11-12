'use client';

import * as React from 'react';
import TopNavigationBar from '@/components/ui/home/top-nav';
import SideNavigationBar from '@/components/ui/home/side-nav';
import { drawerWidth } from '@/components/ui/home/side-nav';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Box, Link } from '@mui/material';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { useSnackbar } from '@/components/ui/notifContext';
import { useEffect, useState } from 'react';
import { getMyActiveSession } from '@/services/collaborationServiceApi';
import router from 'next/router';

interface LayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: LayoutProps) {
  const [appBarHeight, setAppBarHeight] = React.useState(0);
  const pathname = usePathname();
  const isProfilePage = pathname === '/home/profile';

  const { user, isLoading: isAuthLoading } = useAuth();
  const { showNotification } = useSnackbar();
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    if (isAuthLoading || !user || hasCheckedSession) {
      return;
    }

    getMyActiveSession()
      .then((data) => {
        if (data.activeSession) {
          const sessionId = data.activeSession.sessionId;
          const message = (
            <Box>
              You have an active practice session in progress. Click{' '}
              <Link
                href={`/collaboration/${sessionId}`}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/collaboration/${sessionId}`);
                }}
                sx={{
                  color: 'white',
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                here
              </Link>{' '}
              to return.
            </Box>
          );
          showNotification(message);
        }
      })
      .catch((err) => {
        console.error('Failed to check for active session:', err);
      })
      .finally(() => {
        setHasCheckedSession(true);
      });
  }, [user, isAuthLoading, hasCheckedSession, showNotification]);

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
