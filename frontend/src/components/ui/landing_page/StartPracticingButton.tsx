import React from 'react';
import Button, { ButtonProps } from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { openSans } from '@/styles/fonts';

export const StartPracticingButton: React.FC<ButtonProps> = ({ ...props }) => {
  return (
    <Tooltip title="Sign Up">
      <Button
        variant="contained"
        href="/accounts/sign-up"
        sx={{
          color: '#FFFFFF',
          background: '#8B5CF6',
          borderRadius: '100px',
          textTransform: 'none',
          fontSize: { xs: '12px', sm: '14px', md: '20px' },
          fontWeight: 700,
          fontFamily: openSans.style.fontFamily,
          padding: '10px 30px',
        }}
        {...props}
      >
        <Stack direction="row" spacing={2}>
          Start Practicing
          <ChevronRightIcon color="#FFFFFF" className="w-5 md:w-6" />
        </Stack>
      </Button>
    </Tooltip>
  );
};
