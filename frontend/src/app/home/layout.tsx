'use client';

import * as React from 'react';
import "@/styles/globals.css";
import Link from 'next/link';
import { 
    AppBar,
    Box,
    IconButton,
    Stack,
    Toolbar,
    Tooltip
} from "@mui/material";
import { 
    SettingsOutlined, 
    NotificationsOutlined, 
    AccountCircleOutlined 
} from '@mui/icons-material';

interface LayoutProps {
  children: React.ReactNode;
}

export default function HomeLayout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Top AppBar */}
            <AppBar
                position='sticky'
                sx={{
                    backgroundColor:'var(--background)',
                    color: 'var(--foreground)',
                    borderBottom: '0.1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.25)',
                    py: 1
                }}
            >
                <Toolbar>
                    {/* Logo */}
                    <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                        <Tooltip title="/home/dashboard">
                            <Link href='/home/dashboard'>
                                <Box
                                    component='img'
                                    src="/logo.png"
                                    alt="PeerPrep Logo"
                                    sx={{
                                        objectFit: "contain" ,
                                        height: "100%",
                                        maxHeight: { xs: "40px", sm: "56px", md: "72px" },
                                    }}
                                />
                            </Link>
                        </Tooltip>
                    </Box>

                    {/* Top Navigation Bar right elements */}
                    <Stack direction='row' spacing={2}>
                        <Tooltip title="settings">
                            <IconButton 
                                aria-label="settings"
                                sx={{ color: 'var(--foreground)' }}
                            >
                                <SettingsOutlined />
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="notifications">
                            <IconButton 
                                aria-label="notifications"
                                sx={{ color: 'var(--foreground)' }}
                            >
                                <NotificationsOutlined />
                            </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="profile">
                            <IconButton 
                                aria-label="profile"
                                sx={{ color: 'var(--foreground)' }}
                            >
                                <AccountCircleOutlined />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                </Toolbar>
            </AppBar>
        </div>
    )
}