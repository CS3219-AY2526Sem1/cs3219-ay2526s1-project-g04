import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import '@/styles/globals.css';
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  SettingsOutlined,
  NotificationsOutlined,
  AccountCircleOutlined,
} from '@mui/icons-material';

import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';

interface TopNavigationBarProps {
  onHeightChange?: (height: number) => void;
}

export default function CollabNavigationBar({
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
      <Toolbar className="flex flex-row justify-between items-center w-full">
        {/* Logo */}
        <Stack
          direction="row"
          className="flex items-center w-full justify-start"
        >
          <Tooltip title="/home/dashboard">
            <Link href="/home/dashboard">
              <Box
                component="img"
                src="/logo.png"
                alt="PeerPrep Logo"
                className="w-60"
              />
            </Link>
          </Tooltip>
        </Stack>

        {/* Sesssion Buttons */}
        <Stack direction="row" className="w-full justify-center " spacing={2}>
          <Tooltip title="Run code">
            <IconButton className="text-[var(--foreground)]">
              <PlayArrowOutlinedIcon className="text-4xl"></PlayArrowOutlinedIcon>
            </IconButton>
          </Tooltip>

          <Tooltip title="Submit Code">
            <Button
              className="rounded-full border-black px-5 h-10 self-center"
              variant="outlined"
              startIcon={
                <TaskAltOutlinedIcon className="text-green-500"></TaskAltOutlinedIcon>
              }
            >
              <Typography
                className="text-green-500 font-bold normal-case"
                variant="body2"
              >
                Submit
              </Typography>
            </Button>
          </Tooltip>

          <Tooltip title="End Session, you will not be able to join back into this room">
            <Button
              className="rounded-full border-black px-5 h-10 self-center"
              variant="outlined"
              startIcon={
                <CloseOutlinedIcon className="text-red-500"></CloseOutlinedIcon>
              }
            >
              <Typography
                className="text-red-500 font-bold normal-case"
                variant="body2"
              >
                End Sesssion
              </Typography>
            </Button>
          </Tooltip>
        </Stack>

        {/* Top Navigation Bar right elements */}
        <Stack direction="row" spacing={2} className="w-full justify-end">
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
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
