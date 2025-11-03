'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/styles/globals.css';
import {
  AppBar,
  IconButton,
  Toolbar,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogTitle,
  Button,
} from '@mui/material';
import {
  Logout,
  SettingsOutlined,
  NotificationsOutlined,
  AccountCircleOutlined,
} from '@mui/icons-material';

interface TopNavigationBarProps {
  onHeightChange?: (height: number) => void;
}

export default function TopNavigationBar({
  onHeightChange,
  ...props
}: TopNavigationBarProps) {
  const appBarRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); // Initialize router

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    if (appBarRef.current && onHeightChange) {
      // Set initial height
      onHeightChange(appBarRef.current.offsetHeight);

      // Update height dynamically when window resizes
      const resizeHandler = () =>
        onHeightChange(appBarRef.current!.offsetHeight);
      window.addEventListener('resize', resizeHandler);

      return () => window.removeEventListener('resize', resizeHandler);
    }
  }, [onHeightChange]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    router.push('/accounts/profile');
    handleMenuClose();
  };

  const handleSettingsClick = () => {
    router.push('/accounts/account-settings');
    handleMenuClose();
  };

  const handleLogoutClick = () => {
    setOpenDialog(true);
    handleMenuClose();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmLogout = async () => {
    console.log('Logging out...');
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      console.error('Logout failed: Access token not found.');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/accounts/login');
      handleCloseDialog();
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/user/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('Backend logout failed:', await response.json());
      }
    } catch (error) {
      console.error('Error during logout API call:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/accounts/login');
      handleCloseDialog();
    }
  };

  return (
    <>
      <AppBar
        ref={appBarRef}
        position="fixed"
        className="bg-[var(--background)] text-[var(--foreground)] border-b border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] py-1 z-[1100]"
        {...props}
      >
        <Toolbar className="flex justify-between items-center">
          <div className="flex items-center flex-grow">
            <Tooltip title="Dashboard">
              <Link href="/home/dashboard">
                <img
                  src="/logo.png"
                  alt="PeerPrep Logo"
                  className="h-[40px] sm:h-[56px] md:h-[72px] object-contain"
                />
              </Link>
            </Tooltip>
          </div>

          {/* Top Navigation Bar right elements */}
          <div className="flex flex-row space-x-2">
            <Tooltip title="settings">
              <IconButton className="text-[var(--foreground)]">
                <SettingsOutlined />
              </IconButton>
            </Tooltip>

            <Tooltip title="notifications">
              <IconButton className="text-[var(--foreground)]">
                <NotificationsOutlined />
              </IconButton>
            </Tooltip>

            <Tooltip title="profile">
              <IconButton
                onClick={handleMenuOpen}
                className="text-[var(--foreground)]"
              >
                <AccountCircleOutlined />
              </IconButton>
            </Tooltip>
          </div>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleMenuClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleProfileClick}>Profile</MenuItem>
        <MenuItem onClick={handleSettingsClick}>Account Settings</MenuItem>
        <MenuItem onClick={handleLogoutClick}>
          <Logout sx={{ mr: 1, color: 'action.active' }} />
          Logout
        </MenuItem>
      </Menu>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth={true}
        maxWidth="xs"
      >
        <DialogTitle
          sx={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }}
        >
          Logout Confirmation
        </DialogTitle>
        <DialogTitle sx={{ fontSize: '1rem', textAlign: 'center' }}>
          Are you sure you want to log out?
        </DialogTitle>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmLogout} color="primary" autoFocus>
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
