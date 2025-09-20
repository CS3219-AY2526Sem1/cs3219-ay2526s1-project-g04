import React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import { openSans } from "@/styles/fonts";

export const SignUpButton: React.FC<ButtonProps> = ({...props}) => {
    return (
        <Tooltip title='Sign Up'>
            <Button
                variant="contained"
                disableElevation
                href='/accounts/sign-up'
                sx={{
                    color: '#FFFFFF',   // text colour
                    background: 'linear-gradient(90deg, #2563EB, #8B5CF6)', // button background color
                    borderRadius: '10px',
                    textTransform: 'none',  // so button text is not auto capitalised
                    fontSize: { xs: "12px", sm: "14px", md: "20px" },
                    fontWeight: 700,
                    fontFamily: openSans.style.fontFamily,
                    width: { sm: "140px", md: "156px" },
                    minWidth: { xs: "80px", sm: "100px" },
                    padding: { xs: "4px 6px", sm: "6px 8px", md: "10px 8px" }
                }}
                {...props}
            >
                Sign Up
            </Button>
        </Tooltip>
    );
};
