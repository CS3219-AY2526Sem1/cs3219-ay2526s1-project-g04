'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Box,
  Button,
  Link,
  Stack,
  TextField,
  Toolbar,
  Typography,
  CircularProgress,
} from '@mui/material';
import { openSans } from '@/styles/fonts';
import { VerifyOtpForm } from '@/components/ui/accounts/VerifyOtp';

const OTP_COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const [formStep, setFormStep] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const isCooldownActive = cooldownSeconds > 0;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCooldownActive) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCooldownActive]);

  // --- Login Submit Handler ---
  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/user/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        router.push('/home/dashboard');
      } else if (response.status === 403) {
        setError('');
        setResendMessage(data.message || 'A new OTP has been sent.');
        setFormStep('verifyOtp');
        setCooldownSeconds(OTP_COOLDOWN_SECONDS);
      } else if (response.status === 429) {
        setError(data.message || 'Too many attempts. Please wait.');
      } else {
        setError(data.message || 'Login failed.');
      }
    } catch (err) {
      console.log(err);
      setError('Failed to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = useCallback(
    async (submittedOtp: string) => {
      setIsLoading(true);
      setError('');
      setResendMessage('');

      try {
        const response = await fetch(
          'http://localhost:3001/user/auth/verify-email',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: submittedOtp }),
          },
        );
        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          router.push('/home/dashboard');
        } else {
          setError(data.message || 'Verification failed.');
        }
      } catch (err) {
        console.log(err);
        setError('Failed to connect to the server.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, router],
  );

  const handleResendOtp = useCallback(async () => {
    setIsResendingOtp(true);
    setError('');
    setResendMessage('');
    setCooldownSeconds(OTP_COOLDOWN_SECONDS);

    try {
      const response = await fetch(
        'http://localhost:3001/user/auth/resend-otp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        },
      );
      const data = await response.json();

      if (response.ok) {
        setResendMessage('A new OTP has been sent.');
      } else {
        setError(data.message || 'Failed to resend OTP.');
        setCooldownSeconds(0);
      }
    } catch (err) {
      console.log(err);
      setError('Failed to connect to the server.');
      setCooldownSeconds(0);
    } finally {
      setIsResendingOtp(false);
    }
  }, [email]);

  return (
    <main
      className="flex flex-col min-h-screen p-6"
      style={{
        background: 'radial-gradient(circle, #D3E0FB 50%, #E8DEFD 100%)',
      }}
    >
      <AppBar
        position="sticky"
        sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Link href="/">
              <Box
                component="img"
                src="/logo.png"
                alt="PeerPrep Logo"
                sx={{
                  objectFit: 'contain',
                  height: '100%',
                  maxHeight: { xs: '40px', sm: '56px', md: '72px' },
                  cursor: 'pointer',
                }}
              />
            </Link>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            width: { xs: '90%', sm: '400px' },
            p: 4,
            background: '#FFFFFF',
            borderRadius: '10px',
            boxShadow: '0px 4px 30px rgba(0, 0, 0, 0.1)',
          }}
        >
          {formStep === 'login' ? (
            <form onSubmit={handleLoginSubmit}>
              <Stack spacing={2}>
                <Typography
                  sx={{
                    textAlign: 'center',
                    color: '#141127',
                    fontFamily: openSans.style.fontFamily,
                    fontWeight: 700,
                    fontSize: '28px',
                  }}
                >
                  Welcome Back!
                </Typography>

                <TextField
                  label="Email"
                  type="email"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label="Password"
                  type="password"
                  required
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                  <Typography color="error" textAlign="center">
                    {error}
                  </Typography>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isLoading}
                  sx={{
                    py: 1.5,
                    backgroundColor: '#8B5CF6',
                    '&:hover': { backgroundColor: '#7C3AED' },
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Log In'
                  )}
                </Button>

                <Typography
                  sx={{
                    textAlign: 'center',
                    fontFamily: openSans.style.fontFamily,
                    color: '#6B7280',
                    fontSize: '14px',
                  }}
                >
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/accounts/sign-up"
                    sx={{ color: '#8B5CF6', fontWeight: 600 }}
                  >
                    Sign up
                  </Link>
                </Typography>
              </Stack>
            </form>
          ) : (
            <VerifyOtpForm
              email={email}
              onSubmitOtp={handleVerifySubmit}
              onResendOtp={handleResendOtp}
              isLoading={isLoading}
              error={error}
              resendMessage={resendMessage}
              isResendingOtp={isResendingOtp}
              cooldownSeconds={cooldownSeconds}
              otpValue={otp}
              onOtpChange={setOtp}
            />
          )}
        </Box>
      </Box>
    </main>
  );
}
