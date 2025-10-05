'use client';

import * as React from 'react';
import {
    AppBar,
    Box,
    Button,
    Link,
    Stack,
    TextField,
    Toolbar,
    Typography
} from '@mui/material';
import { openSans } from "@/styles/fonts";

export default function LoginPage() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        // send to backend API
        console.log({ email, password });
        // TODO: Implement API call to log in the user
    };

    return (
        <main
            className="flex flex-col min-h-screen p-6"
            style={{
                background: 'radial-gradient(circle, #D3E0FB 50%, #E8DEFD 100%)'
            }}
        >
            {/* Top navigation bar */}
            <AppBar
                position='sticky'
                sx={{
                    backgroundColor:'transparent',
                    boxShadow: 'none'
                }}
            >
                <Toolbar>
                    {/* Logo */}
                    <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                        <Link href="/">
                            <Box
                                component='img'
                                src="/logo.png"
                                alt="PeerPrep Logo"
                                sx={{
                                    objectFit: "contain" ,
                                    height: "100%",
                                    maxHeight: { xs: "40px", sm: "56px", md: "72px" },
                                    cursor: 'pointer'
                                }}
                            />
                        </Link>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Login Form */}
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
                        boxShadow: '0px 4px 30px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <Typography
                                sx={{
                                    textAlign: 'center',
                                    color: '#141127',
                                    fontFamily: openSans.style.fontFamily,
                                    fontWeight: 700,
                                    fontSize: '28px'
                                }}
                            >
                                Welcome Back!
                            </Typography>

                            <TextField
                                label="Email"
                                variant="outlined"
                                type="email"
                                required
                                fullWidth
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <TextField
                                label="Password"
                                variant="outlined"
                                type="password"
                                required
                                fullWidth
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                sx={{
                                    py: 1.5,
                                    backgroundColor: '#8B5CF6',
                                    '&:hover': {
                                        backgroundColor: '#7C3AED'
                                    },
                                    textTransform: 'none',
                                    fontSize: '16px',
                                    fontWeight: 600
                                }}
                            >
                                Log In
                            </Button>

                            <Typography
                                sx={{
                                    textAlign: 'center',
                                    fontFamily: openSans.style.fontFamily,
                                    color: '#6B7280',
                                    fontSize: '14px'
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