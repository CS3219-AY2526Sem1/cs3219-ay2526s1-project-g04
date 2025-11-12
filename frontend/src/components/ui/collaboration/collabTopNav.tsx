import React, { useRef, useEffect, useState } from 'react';
import { useCodeContext } from '../collaboration/CodeContext';
import Link from 'next/link';
import '@/styles/globals.css';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
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
import { terminateSessionIsSuccess } from '@/services/collaborationServiceApi';
import { useRouter } from 'next/navigation';
import {
  getCollabProvider,
  removeCollabProvider,
  removeCommsProvider,
} from './collabSingleton';
import { getUserId } from '@/lib/utils/jwt';

interface TopNavigationBarProps {
  onHeightChange?: (height: number) => void;
}

export default function CollabNavigationBar({
  onHeightChange,
  ...props
}: TopNavigationBarProps) {
  const appBarRef = useRef<HTMLDivElement>(null);

  const { code, language, testCases, setResults, sessionId, entryPoint } =
    useCodeContext();
  const router = useRouter();
  const [runningCode, setRunningCode] = useState<boolean>(false);
  const CODEEXEURL = process.env.NEXT_PUBLIC_API_CODE_EXE_SERVICE;

  useEffect(() => {
    if (appBarRef.current && onHeightChange) {
      onHeightChange(appBarRef.current.offsetHeight);
      const resizeHandler = () =>
        onHeightChange(appBarRef.current!.offsetHeight);
      window.addEventListener('resize', resizeHandler);
      return () => window.removeEventListener('resize', resizeHandler);
    }
  }, [onHeightChange]);

  async function runCode(language: string, code: string) {
    try {
      const response = await fetch('http://localhost:5000/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });
      const result = await response.json();
      console.log('[Runner Output]', result);
      alert(`Output:\n${result.stdout || result.stderr}`);
      return result;
    } catch (err) {
      console.error('Error running code:', err);
    }
  }

  async function runBatchCode(code: string, inputs: string[]) {
    console.log('[Batch Runner Inputs]', inputs);

    // console.log('parsed output', parsedInputs);
    // console.log(JSON.stringify({ code, parsedInputs }));
    // console.log(JSON.stringify({ code, inputs }));
    setRunningCode(true);
    try {
      const response = await fetch(`${CODEEXEURL}/batch-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, inputs, entryPoint }),
      });

      const results = await response.json();
      console.log('[Batch Runner Results]', results);

      if (results?.outputs) {
        console.log('outputs', results.outputs);
        setResults(results.outputs);
        setRunningCode(false);
        console.log('[Context Updated] Stored outputs in test case context.');
      } else {
        setRunningCode(false);
        console.warn('⚠️ No outputs found in response.');
      }

      return results;
    } catch (err) {
      setRunningCode(false);
      console.error('❌ Error running batch code:', err);
    }
  }

  // Hook it up to the button
  const handleRunClick = () => {
    if (!code) {
      alert('No code to run!');
      return;
    }
    // runCode(language, code);
    runBatchCode(
      code,
      testCases.filter((t) => t.visible == 'sample').map((t) => t.input),
    );
  };

  const handleRunSubmitClick = () => {
    if (!code) {
      alert('No code to run!');
      return;
    }
    // runCode(language, code);
    runBatchCode(
      code,
      testCases.map((t) => t.input),
    );
  };

  const handleEndSession = async () => {
    try {
      if (!sessionId) {
        alert('session id missing');
        return;
      }
      const terminated = await terminateSessionIsSuccess(
        sessionId,
        getUserId()!.toString(),
      );
      if (terminated) {
        const providers = getCollabProvider(sessionId, getUserId()!.toString());
        if (providers && providers.yCodeDoc) {
          console.log('SENDING MESSAGE');
          const yNotifications = providers.yCodeDoc.getMap('notifications');
          const messagePayload = {
            type: 'end',
            senderId: getUserId(),
            message:
              'your coding buddy has left, you will be redirected to the home page',
            timestamp: Date.now(),
          };
          yNotifications.set(Date.now().toString(), messagePayload);
          removeCollabProvider();
          removeCommsProvider();
          router.push('/home/dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      // Show error message to user
    }
  };

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

        {runningCode ? (
          <Stack direction="row" className="w-full justify-center" spacing={2}>
            <CircularProgress size={30} />
            <Typography variant="body1" className="self-center">
              Running...
            </Typography>
          </Stack>
        ) : (
          // {/* Sesssion Buttons */}
          <Stack direction="row" className="w-full justify-center " spacing={2}>
            <Tooltip title="Run code">
              <IconButton
                className="text-[var(--foreground)]"
                onClick={handleRunClick} // ✅ calls your function
              >
                <PlayArrowOutlinedIcon className="text-4xl" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Submit Code">
              <Button
                className="rounded-full border-black px-5 h-10 self-center"
                variant="outlined"
                startIcon={
                  <TaskAltOutlinedIcon className="text-green-500"></TaskAltOutlinedIcon>
                }
                onClick={handleRunSubmitClick}
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
                onClick={handleEndSession}
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
        )}
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
