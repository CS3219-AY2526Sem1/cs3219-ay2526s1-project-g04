'use client';

import * as React from 'react';
import { Chip, ChipProps } from '@mui/material';

interface CustomChipProps extends ChipProps {
  colorHex: string; // border & text color
  label: string;
}

export default function CustomChip({
  colorHex,
  label,
  ...props
}: CustomChipProps) {
  return (
    <Chip
      {...props}
      label={label}
      variant="outlined"
      className="text-base py-2 px-2 rounded-full"
      style={{
        border: `1px solid ${colorHex}`,
        color: `${colorHex}`,
      }}
    />
  );
}
