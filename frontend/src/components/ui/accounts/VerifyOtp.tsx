'use client';

import React, { useState, useEffect } from 'react';
import {
  Stack,
  TextField,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import { openSans } from '@/styles/fonts';

interface VerifyOtpFormProps {
  email: string;
  onSubmitOtp: (otp: string) => Promise<void>;
  onResendOtp: () => Promise<void>;
  isLoading: boolean;
  error: string;
  resendMessage: string;
  isResendingOtp: boolean;
  cooldownSeconds: number;
  onOtpChange: (otp: string) => void;
  otpValue: string;
}

export function VerifyOtpForm({
  email,
  onSubmitOtp,
  onResendOtp,
  isLoading,
  error,
  resendMessage,
  isResendingOtp,
  cooldownSeconds,
  onOtpChange,
  otpValue,
}: VerifyOtpFormProps) {
  const isCooldownActive = cooldownSeconds > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmitOtp(otpValue);
  };

  return (
    <form onSubmit={handleSubmit}>
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
          Verify Your Email
        </Typography>
        <Typography sx={{ textAlign: 'center', color: '#6B7280' }}>
          We've sent a 6-digit code to <strong>{email}</strong>. Please enter it
          below.
        </Typography>

        <TextField
          label="Verification Code"
          required
          fullWidth
          value={otpValue}
          onChange={(e) => onOtpChange(e.target.value)}
          inputProps={{ maxLength: 6 }}
        />

        {error && <Typography color="error">{error}</Typography>}
        {resendMessage && (
          <Typography color="success.main" textAlign="center">
            {resendMessage}
          </Typography>
        )}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isLoading || otpValue.length !== 6}
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
            'Verify and Log In'
          )}
        </Button>
        <Button
          variant="text"
          onClick={onResendOtp}
          disabled={isResendingOtp || isCooldownActive}
          sx={{ textTransform: 'none', color: '#8B5CF6', fontWeight: 600 }}
        >
          {isResendingOtp ? (
            <CircularProgress size={16} sx={{ mr: 1 }} />
          ) : null}
          {isCooldownActive
            ? `Resend Code in ${cooldownSeconds}s`
            : 'Resend Code'}
        </Button>
      </Stack>
    </form>
  );
}
