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

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
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

export default function SignUpPage() {
    const [formStep, setFormStep] = useState('signup'); // 'signup' or 'verifyOtp'
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState(''); // Added username
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const [usernameError, setUsernameError] = useState('');
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

    const [isResendingOtp, setIsResendingOtp] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    // --- Username Format Validation ---
    const usernameFormatRequirements = useMemo(() => {
        const hasMinLength = username.length >= 3;
        const hasValidChars = /^[a-z0-9_]+$/.test(username) || username.length === 0; // Allow empty initially
        return {
            lengthMet: hasMinLength,
            charsMet: hasValidChars,
        };
    }, [username]);

    const isUsernameFormatValid = usernameFormatRequirements.lengthMet && usernameFormatRequirements.charsMet;

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
                const response = await fetch(`http://localhost:3001/user/check-username?username=${encodeURIComponent(uname)}`);
                if (!response.ok) { throw new Error('Network response was not ok'); }
                const data = await response.json();
                setIsUsernameAvailable(data.isAvailable);
                if (!data.isAvailable) {
                    setUsernameError('Username is already taken.');
                }
            } catch (err) {
                setUsernameError('Could not check username. Please try again.');
                setIsUsernameAvailable(null);
            } finally {
                setIsCheckingUsername(false);
            }
        }, 500), // Debounce for 500ms
        [isUsernameFormatValid]);

    useEffect(() => {
        setIsUsernameAvailable(null);
        setUsernameError('');
        checkUsernameAvailability(username);
    }, [username, checkUsernameAvailability]);

    // --- UPDATED: API call for the initial signup ---
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
            const response = await fetch('http://localhost:3001/user/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setFormStep('verifyOtp');
            } else {
                setError(data.message || 'An unknown error occurred.');
            }
        } catch (err) {
            setError('Failed to connect to the server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- NEW: API call for verifying the OTP ---
    const handleVerifySubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(
                'http://localhost:3001/user/auth/verify-email',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, otp }),
                },
            );

            const data = await response.json();

            if (response.ok) {
                // On success, save tokens and redirect to dashboard
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                router.push('/dashboard');
            } else {
                setError(data.message || 'An unknown error occurred.');
            }
        } catch (err) {
            setError('Failed to connect to the server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setIsResendingOtp(true);
        setError('');
        setResendMessage('');

        try {
            const response = await fetch('http://localhost:3001/user/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setResendMessage('A new OTP has been sent.');
            } else {
                setError(data.message || 'Failed to resend OTP.');
            }
        } catch (err) {
            setError('Failed to connect to the server. Please try again.');
        } finally {
            setIsResendingOtp(false);
        }
    };

    const isSignupFormValid = isPasswordValid && doPasswordsMatch && isUsernameFormatValid && isUsernameAvailable === true;

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
                    <Box
                        sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}
                    >
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

                                <TextField label="Email" type="email" required fullWidth value={email} onChange={(e) => setEmail(e.target.value)}/>
                                <TextField
                                    label="Username"
                                    required
                                    fullWidth
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    error={!!usernameError || (username.length > 0 && !isUsernameFormatValid)}
                                />
                                <FormHelperText error={!!usernameError || (username.length > 0 && !isUsernameFormatValid)}>
                                    {username.length > 0 && !usernameFormatRequirements.lengthMet && "Must be at least 3 characters. "}
                                    {username.length > 0 && !usernameFormatRequirements.charsMet && "Only lowercase letters, numbers, and underscores (_). "}
                                    {usernameError}
                                    {isCheckingUsername && "Checking availability..."}
                                    {!isCheckingUsername && isUsernameAvailable === true && username.length > 0 && <span style={{ color: 'green' }}>Username available!</span>}
                                </FormHelperText>
                                <TextField label="Password" type="password" required fullWidth value={password} onChange={(e) => setPassword(e.target.value)}/>
                                {password && (
                                    <Box>
                                        {passwordRequirements.map((req) => (
                                            <Typography key={req.text} variant="caption" sx={{ color: req.met ? 'green' : 'red', display: 'block' }}>
                                                {req.met ? '✓' : '✗'} {req.text}
                                            </Typography>
                                        ))}
                                    </Box>
                                )}
                                <TextField
                                    label="Confirm Password" type="password" required fullWidth
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
                                    type="submit" variant="contained" fullWidth
                                    disabled={!isPasswordValid || !doPasswordsMatch || isLoading || !isSignupFormValid || isCheckingUsername}
                                    sx={{
                                        py: 1.5,
                                        backgroundColor: '#8B5CF6',
                                        '&:hover': { backgroundColor: '#7C3AED' },
                                        textTransform: 'none', fontSize: '16px', fontWeight: 600
                                    }}
                                >
                                    {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Sign Up'}
                                </Button>

                                <Typography sx={{ textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                                    Already have an account?{' '}
                                    <Link href="/accounts/login" sx={{ color: '#8B5CF6', fontWeight: 600 }}>Log in</Link>
                                </Typography>
                            </Stack>
                        </form>
                    ) : (
                        // --- STEP 2: OTP VERIFICATION FORM ---
                        <form onSubmit={handleVerifySubmit}>
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
                                    We've sent a 6-digit code to <strong>{email}</strong>. Please
                                    enter it below.
                                </Typography>

                                <TextField label="Verification Code" required fullWidth value={otp} onChange={(e) => setOtp(e.target.value)} inputProps={{ maxLength: 6 }}/>

                                {error && <Typography color="error">{error}</Typography>}

                                <Button
                                    type="submit" variant="contained" fullWidth disabled={isLoading || otp.length !== 6}
                                    sx={{
                                        py: 1.5,
                                        backgroundColor: '#8B5CF6',
                                        '&:hover': { backgroundColor: '#7C3AED' },
                                        textTransform: 'none', fontSize: '16px', fontWeight: 600
                                    }}
                                >
                                    {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify and Log In'}
                                </Button>
                                <Button
                                    variant="text"
                                    onClick={handleResendOtp}
                                    disabled={isResendingOtp}
                                    sx={{ textTransform: 'none', color: '#8B5CF6', fontWeight: 600 }}
                                >
                                    {isResendingOtp ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                                    Resend Code
                                </Button>
                            </Stack>
                        </form>
                    )}
                </Box>
            </Box>
        </main>
    );
}