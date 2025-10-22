'use client';

import React, { useState, useMemo } from 'react';
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

export default function SignUpPage() {
    // --- UPDATED: State management for the two-step form ---
    const [formStep, setFormStep] = useState('signup'); // 'signup' or 'verifyOtp'
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState(''); // Added username
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

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

    // --- UPDATED: API call for the initial signup ---
    const handleSignupSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!isPasswordValid || !doPasswordsMatch) {
            setError('Please ensure your password meets all requirements.');
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:3001/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // On success, switch to the OTP verification step
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
                'http://localhost:3001/api/auth/verify-email',
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
                                <TextField label="Username" required fullWidth value={username} onChange={(e) => setUsername(e.target.value)}/>
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
                                    disabled={!isPasswordValid || !doPasswordsMatch || isLoading}
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
                                {/* Add a 'Resend OTP' button here if you like */}
                            </Stack>
                        </form>
                    )}
                </Box>
            </Box>
        </main>
    );
}