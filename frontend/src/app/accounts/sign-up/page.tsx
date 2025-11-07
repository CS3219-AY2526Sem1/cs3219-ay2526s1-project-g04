'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  FormHelperText,
} from '@mui/material';
import { openSans } from '@/styles/fonts';
import { VerifyOtpForm } from '@/components/ui/accounts/VerifyOtp';
import {
  checkUsername,
  resendOtp,
  signup,
  verifyEmail,
} from '@/services/userServiceApi';
import { setTokens } from '@/lib/utils/jwt';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

const OTP_COOLDOWN_SECONDS = 60;

export default function SignUpPage() {
  const [formStep, setFormStep] = useState('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null);

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

  // --- Username Format Validation ---
  const usernameFormatRequirements = useMemo(() => {
    const hasMinLength = username.length >= 3;
    const hasValidChars =
      /^[a-z0-9_]+$/.test(username) || username.length === 0; // Allow empty initially
    return {
      lengthMet: hasMinLength,
      charsMet: hasValidChars,
    };
  }, [username]);

  const isUsernameFormatValid =
    usernameFormatRequirements.lengthMet && usernameFormatRequirements.charsMet;

  // --- Password validation logic (from previous step) ---
  const passwordRequirements = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasCapital = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);
    return [
      { text: 'At least 8 characters', met: hasMinLength },
      { text: 'At least one uppercase letter', met: hasCapital },
      { text: 'At least one number', met: hasNumber },
      { text: 'At least one special character (@$!%*?&)', met: hasSpecialChar },
    ];
  }, [password]);

  const isPasswordValid = passwordRequirements.every((req) => req.met);
  const doPasswordsMatch = password === confirmPassword && password !== '';

  // fe username validity + accuracy check
  const checkUsernameAvailability = useCallback(
    debounce(async (uname: string) => {
      if (!uname || !isUsernameFormatValid) {
        setIsUsernameAvailable(null);
        setIsCheckingUsername(false);
        return;
      }
      setIsCheckingUsername(true);
      setUsernameError('');
      try {
        const data = await checkUsername(uname);
        setIsUsernameAvailable(data.isAvailable);
        if (!data.isAvailable) {
          setUsernameError('Username is already taken.');
        }
      } catch (err) {
        console.error(err);
        setUsernameError('Could not check username. Please try again.');
        setIsUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500), // Debounce for 500ms
    [isUsernameFormatValid],
  );

  useEffect(() => {
    setIsUsernameAvailable(null);
    setUsernameError('');
    checkUsernameAvailability(username);
  }, [username, checkUsernameAvailability]);

  // --- API call for the initial signup ---
  const handleSignupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPasswordValid || !doPasswordsMatch) {
      setError('Please ensure your password meets all requirements.');
      return;
    }
    if (!isUsernameFormatValid) {
      setUsernameError('Username format is invalid.');
      return;
    }
    if (isCheckingUsername || isUsernameAvailable === false) {
      setError('Please choose an available username.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const data = await signup({ email, username, password });
      if (data) {
        setFormStep('verifyOtp');
      } else {
        setError(data || 'An unknown error occurred.');
        setCooldownSeconds(0);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to the server. Please try again.');
      setCooldownSeconds(0);
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: API call for verifying the OTP ---
  const handleVerifySubmit = useCallback(
    async (submittedOtp: string) => {
      setIsLoading(true);
      setError('');
      setResendMessage('');
      try {
        const data = await verifyEmail({ email, otp: submittedOtp });
        setTokens(data.accessToken, data.refreshToken);
        router.push('/home/dashboard');
      } catch (err) {
        console.error(err);
        setError('Failed to connect to the server. Please try again.');
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
      const data = await resendOtp(email);
      setResendMessage('A new OTP has been sent.');
    } catch (err) {
      console.error(err);
      setError('Failed to connect to the server. Please try again.');
      setCooldownSeconds(0);
    } finally {
      setIsResendingOtp(false);
    }
  }, [email]);

  const isSignupFormValid =
    isPasswordValid &&
    doPasswordsMatch &&
    isUsernameFormatValid &&
    isUsernameAvailable === true;

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
          {formStep === 'signup' ? (
            // --- STEP 1: SIGN UP FORM ---
            <form onSubmit={handleSignupSubmit}>
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
                  Create Your Account
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
                  label="Username"
                  required
                  fullWidth
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  error={
                    !!usernameError ||
                    (username.length > 0 && !isUsernameFormatValid)
                  }
                  inputProps={{ maxLength: 30 }}
                />
                <FormHelperText
                  error={
                    !!usernameError ||
                    (username.length > 0 && !isUsernameFormatValid)
                  }
                >
                  {username.length > 0 &&
                    !usernameFormatRequirements.lengthMet &&
                    'Must be at least 3 characters. '}
                  {username.length > 0 &&
                    !usernameFormatRequirements.charsMet &&
                    'Only lowercase letters, numbers, and underscores (_). '}
                  {usernameError}
                  {isCheckingUsername && 'Checking availability...'}
                  {!isCheckingUsername &&
                    isUsernameAvailable === true &&
                    username.length > 0 && (
                      <span style={{ color: 'green' }}>
                        Username available!
                      </span>
                    )}
                </FormHelperText>
                <TextField
                  label="Password"
                  type="password"
                  required
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {password && (
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
                  label="Confirm Password"
                  type="password"
                  required
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={confirmPassword ? !doPasswordsMatch : false}
                  helperText={
                    confirmPassword && !doPasswordsMatch
                      ? 'Passwords do not match'
                      : ''
                  }
                />

                {error && <Typography color="error">{error}</Typography>}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={
                    !isPasswordValid ||
                    !doPasswordsMatch ||
                    isLoading ||
                    !isSignupFormValid ||
                    isCheckingUsername ||
                    isCooldownActive
                  }
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
                  ) : isCooldownActive ? (
                    `Wait ${cooldownSeconds}s`
                  ) : (
                    'Sign Up'
                  )}
                </Button>

                <Typography
                  sx={{
                    textAlign: 'center',
                    color: '#6B7280',
                    fontSize: '14px',
                  }}
                >
                  Already have an account?{' '}
                  <Link
                    href="/accounts/login"
                    sx={{ color: '#8B5CF6', fontWeight: 600 }}
                  >
                    Log in
                  </Link>
                </Typography>
              </Stack>
            </form>
          ) : (
            // --- STEP 2: OTP VERIFICATION FORM ---
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
