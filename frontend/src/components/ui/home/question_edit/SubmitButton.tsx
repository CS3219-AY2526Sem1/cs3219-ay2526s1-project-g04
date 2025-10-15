'use client';

import Button from "@mui/material/Button";
import Tooltip from '@mui/material/Tooltip';

export default function SubmitButton() {
  return (
    <Tooltip title='Submit'>
      <Button
        type='submit'
        variant='outlined'
        className='rounded-full text-lg text-blue-600 normal-case border-blue-600'
      >
        Submit
      </Button>
    </Tooltip>
  );
};
