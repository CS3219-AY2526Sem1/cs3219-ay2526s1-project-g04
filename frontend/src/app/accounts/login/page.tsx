'use client';

import React, { useState } from 'react';
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

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // --- ADDED: State for loading and error messages ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // --- UPDATED: handleSubmit function to call the backend API ---
    const handleSubmit = async (event: React.FormEvent) => {
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
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                router.push('/home/dashboard');
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
                                Welcome Back!
                            </Typography>

                            <TextField label="Email" type="email" required fullWidth value={email} onChange={(e) => setEmail(e.target.value)}/>
                            <TextField label="Password" type="password" required fullWidth value={password} onChange={(e) => setPassword(e.target.value)}/>

                            {/* --- ADDED: Display error messages --- */}
                            {error && (
                                <Typography color="error" textAlign="center">
                                    {error}
                                </Typography>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={isLoading} // --- ADDED: Disable button while loading
                                sx={{
                                    py: 1.5,
                                    backgroundColor: '#8B5CF6',
                                    '&:hover': { backgroundColor: '#7C3AED' },
                                    textTransform: 'none',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                }}
                            >
                                {/* --- ADDED: Show loading spinner --- */}
                                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
                            </Button>

                            <Typography
                                sx={{
                                    textAlign: 'center',
                                    fontFamily: openSans.style.fontFamily,
                                    color: '#6B7280',
                                    fontSize: '14px',
                                }}
                            >
                                Don't have an account?{' '}
                                <Link href="/accounts/sign-up" sx={{ color: '#8B5CF6', fontWeight: 600 }}>
                                    Sign up
                                </Link>
                            </Typography>
                        </Stack>
                    </form>
                </Box>
            </Box>
        </main>
    );
}