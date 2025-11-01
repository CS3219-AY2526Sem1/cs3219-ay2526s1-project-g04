import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import '@/styles/globals.css';
import { AppBar, IconButton, Toolbar, Tooltip } from '@mui/material';
import {
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

  useEffect(() => {
    if (appBarRef.current && onHeightChange) {
      onHeightChange(appBarRef.current.offsetHeight);
      const resizeHandler = () =>
        onHeightChange(appBarRef.current!.offsetHeight);
      window.addEventListener('resize', resizeHandler);
      return () => window.removeEventListener('resize', resizeHandler);
    }
  }, [onHeightChange]);

  return (
    <AppBar
      ref={appBarRef}
      position="fixed"
      className="bg-[var(--background)] text-[var(--foreground)] border-b border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.25)] py-1 z-[1100]"
      {...props}
    >
      <Toolbar className="flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center flex-grow">
          <Tooltip title="/home/dashboard">
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
            <IconButton className="text-[var(--foreground)]">
              <AccountCircleOutlined />
            </IconButton>
          </Tooltip>
        </div>
      </Toolbar>
    </AppBar>
  );
}
