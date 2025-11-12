'use client';
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Snackbar, Alert } from '@mui/material';

interface SnackbarContextType {
  showNotification: (
    message: React.ReactNode,
    severity?: 'success' | 'error' | 'info' | 'warning',
  ) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(
  undefined,
);

export const SnackbarProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<React.ReactNode>('');

  const handleClose = useCallback(() => setOpen(false), []);

  // const showNotification = useCallback((msg: string) => {
  //   setMessage(msg);
  //   setOpen(true);
  // }, []);

  const showNotification = useCallback(
    (
      msg: React.ReactNode,
      sev: 'success' | 'error' | 'info' | 'warning' = 'info',
    ) => {
      setMessage(msg);
      setOpen(true);
    },
    [],
  );

  const customAlertStyle = {
    backgroundColor: '#1C2541',
    color: '#E0E1DD',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
    borderLeft: '5px solid #7D5A9C',
    padding: '12px 20px',
    fontWeight: 600,
    minWidth: '300px',
  };

  return (
    <SnackbarContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={10000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity="info"
          variant="filled"
          sx={customAlertStyle}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error(
      'useSnackbar must be used within a SnackbarProvider. Is your component a "use client" component?',
    );
  }
  return context;
};
