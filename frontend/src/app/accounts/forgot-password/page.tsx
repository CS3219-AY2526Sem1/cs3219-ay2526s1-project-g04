'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';
import { openSans } from '@/styles/fonts';
import {
  requestForgotPassword,
  resetPassword,
} from '@/services/userServiceApi';

const OTP_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const router = useRouter();

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

  const passwordRequirements = useMemo(() => {
    const hasMinLength = newPassword.length >= 8;
    const hasCapital = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[@$!%*?&]/.test(newPassword);
    return [
      { text: 'At least 8 characters', met: hasMinLength },
      { text: 'At least one uppercase letter', met: hasCapital },
      { text: 'At least one number', met: hasNumber },
      { text: 'At least one special character (@$!%*?&)', met: hasSpecialChar },
    ];
  }, [newPassword]);

  const isPasswordValid = passwordRequirements.every((req) => req.met);
  const doPasswordsMatch =
    newPassword === confirmPassword && newPassword !== '';

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await requestForgotPassword({ email });
      setSuccess(data.message);
      setStep('otp');
      setCooldownSeconds(OTP_COOLDOWN_SECONDS);
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      setIsLoading(false);
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const data = await resetPassword({ email, otp, newPassword });
      setSuccess(data.message);
      setStep('success');
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (isCooldownActive) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await requestForgotPassword({ email });
      setSuccess('Reset code sent again!');
      setCooldownSeconds(OTP_COOLDOWN_SECONDS);
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

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
          {step === 'email' && (
            <form onSubmit={handleRequestOtp}>
              <Stack spacing={3}>
                <Typography
                  variant="h4"
                  sx={{
                    textAlign: 'center',
                    color: '#141127',
                    fontFamily: openSans.style.fontFamily,
                    fontWeight: 700,
                    fontSize: '28px',
                  }}
                >
                  Forgot Password?
                </Typography>

                <Typography
                  sx={{
                    textAlign: 'center',
                    color: '#6B7280',
                    fontFamily: openSans.style.fontFamily,
                    fontSize: '14px',
                  }}
                >
                  Enter your email address and we&apos;ll send you a code to
                  reset your password.
                </Typography>

                <TextField
                  label="Email"
                  type="email"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                  </Alert>
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
                    'Send Reset Code'
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
                  Remember your password?{' '}
                  <Link
                    href="/accounts/login"
                    sx={{ color: '#8B5CF6', fontWeight: 600 }}
                  >
                    Back to Login
                  </Link>
                </Typography>
              </Stack>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleResetPassword}>
              <Stack spacing={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <IconButton onClick={handleBackToEmail} sx={{ mr: 1 }}>
                    <ArrowBack />
                  </IconButton>
                  <Typography
                    variant="h4"
                    sx={{
                      color: '#141127',
                      fontFamily: openSans.style.fontFamily,
                      fontWeight: 700,
                      fontSize: '28px',
                    }}
                  >
                    Reset Password
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    color: '#6B7280',
                    fontFamily: openSans.style.fontFamily,
                    fontSize: '14px',
                  }}
                >
                  Enter the 6-digit code sent to <strong>{email}</strong> and
                  your new password.
                </Typography>

                <TextField
                  label="Reset Code"
                  required
                  fullWidth
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  inputProps={{ maxLength: 6 }}
                />

                <TextField
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {newPassword && (
                  <Box>
                    {passwordRequirements.map((req) => (
                      <Typography
                        key={req.text}
                        variant="caption"
                        sx={{
                          color: req.met ? 'green' : 'red',
                          display: 'block',
                        }}
                      >
                        {req.met ? '✓' : '✗'} {req.text}
                      </Typography>
                    ))}
                  </Box>
                )}
                <TextField
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          edge="end"
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isLoading || otp.length !== 6}
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
                    'Reset Password'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontFamily: openSans.style.fontFamily,
                      color: '#6B7280',
                      fontSize: '14px',
                      mb: 1,
                    }}
                  >
                    Didn&apos;t receive the code?
                  </Typography>
                  <Button
                    onClick={handleResendOtp}
                    disabled={isCooldownActive || isLoading}
                    sx={{
                      color: '#8B5CF6',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '14px',
                    }}
                  >
                    {isCooldownActive
                      ? `Resend in ${cooldownSeconds}s`
                      : 'Resend Code'}
                  </Button>
                </Box>
              </Stack>
            </form>
          )}

          {step === 'success' && (
            <Stack spacing={3} sx={{ textAlign: 'center' }}>
              <Typography
                variant="h4"
                sx={{
                  color: '#141127',
                  fontFamily: openSans.style.fontFamily,
                  fontWeight: 700,
                  fontSize: '28px',
                }}
              >
                Password Reset Successful!
              </Typography>

              <Typography
                sx={{
                  color: '#6B7280',
                  fontFamily: openSans.style.fontFamily,
                  fontSize: '16px',
                }}
              >
                Your password has been successfully reset. You can now log in
                with your new password.
              </Typography>

              <Button
                variant="contained"
                fullWidth
                onClick={() => router.push('/accounts/login')}
                sx={{
                  py: 1.5,
                  backgroundColor: '#8B5CF6',
                  '&:hover': { backgroundColor: '#7C3AED' },
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                Go to Login
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
    </main>
  );
}
