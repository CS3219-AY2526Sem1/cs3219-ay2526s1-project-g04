import React from "react";
import Button, { ButtonProps } from "@mui/material/Button";
import { openSans } from "@/app/ui/fonts";

interface CustomButtonProps extends ButtonProps {
    children: React.ReactNode;
    customTextColor?: string;
    customFillColor?: string;
    href?: string;
}

export const SquaredOutlinedButton: React.FC<CustomButtonProps> = ({
    children, 
    customTextColor = '#2563EB',
    customFillColor = '#2563EB',
    href, 
    ...props
}) => {
    return (
        <Button
            variant="outlined"
            href={href}
            sx = {{
                color: customTextColor,
                borderColor: customFillColor,
                borderWidth: "2px",
                borderRadius: "10px",
                textTransform: "none",
                fontSize: { xs: "12px", sm: "14px", md: "20px" },
                fontWeight: 700,
                fontFamily: openSans.style.fontFamily,
                width: { sm: "140px", md: "156px" },
                minWidth: { xs: "80px", sm: "100px" },
                padding: { xs: "4px 6px", sm: "6px 8px", md: "10px 8px" },
            }}
            {...props}
        >
            {children}
        </Button>
    );
};

export const SquaredFilledButton: React.FC<CustomButtonProps> = ({
    children, 
    customTextColor = '#FFFFFF',
    customFillColor = 'linear-gradient(90deg, #2563EB, #8B5CF6)',
    href, 
    ...props
}) => {
    return (
        <Button
            variant="contained"
            disableElevation
            href={href}
            sx = {{
                color: customTextColor,
                background: customFillColor,
                borderRadius: "10px",
                textTransform: "none",
                fontSize: { xs: "12px", sm: "14px", md: "20px" },
                fontWeight: 700,
                fontFamily: openSans.style.fontFamily,
                width: { sm: "140px", md: "156px" },
                minWidth: { xs: "80px", sm: "100px" },
                padding: { xs: "4px 6px", sm: "6px 8px", md: "10px 8px" },
            }}
            {...props}
        >
            {children}
        </Button>
    );
};

export const RoundedFilledButton: React.FC<CustomButtonProps> = ({
    children, 
    customTextColor = '#FFFFFF',
    customFillColor = 'linear-gradient(90deg, #2563EB, #8B5CF6)',
    href, 
    ...props
}) => {
    return (
        <Button
            variant="contained"
            disableElevation
            href={href}
            sx = {{
                color: customTextColor,
                background: customFillColor,
                borderRadius: "100px",
                textTransform: "none",
                fontSize: { xs: "12px", sm: "14px", md: "20px" },
                fontWeight: 700,
                fontFamily: openSans.style.fontFamily,
                padding: "10px 30px",
            }}
            {...props}
        >
            {children}
        </Button>
    );
};
