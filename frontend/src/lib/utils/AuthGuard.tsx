'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for the token on the client side
    const token = localStorage.getItem('accessToken');

    if (!token) {
      // No token found, redirect to login
      router.push('/accounts/login');
    } else {
      // Token found, allow rendering
      // Note: We are just checking for existence.
      // Your apiClient will handle expired tokens during the actual API calls.
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  }, [router]);

  // While checking, show a full-screen loader
  if (isLoading) {
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

  // If authenticated, render the actual page
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated (and redirect is in progress), render nothing
  return null;
}
