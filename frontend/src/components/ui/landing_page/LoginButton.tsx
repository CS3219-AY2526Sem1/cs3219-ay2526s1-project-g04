import React from 'react';
import Button, { ButtonProps } from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { openSans } from '@/styles/fonts';

export const LoginButton: React.FC<ButtonProps> = ({ ...props }) => {
  return (
    <Tooltip title="Login">
      <Button
        variant="outlined"
        href="/accounts/login"
        sx={{
          color: '#2563EB', // text color
          borderColor: '#2563EB', // border color
          borderWidth: '2px', // border thickness
          borderRadius: '10px', // border roundness
          textTransform: 'none', // don't auto transform text to caps
          fontSize: { xs: '12px', sm: '14px', md: '20px' }, // font size
          fontWeight: 700,
          fontFamily: openSans.style.fontFamily,
          width: { sm: '140px', md: '156px' },
          minWidth: { xs: '80px', sm: '100px' },
          padding: { xs: '4px 6px', sm: '6px 8px', md: '10px 8px' },
        }}
        {...props}
      >
        Log In
      </Button>
    </Tooltip>
  );
};
