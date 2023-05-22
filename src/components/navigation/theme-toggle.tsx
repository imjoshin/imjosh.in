import React from "react";
import { useThemeName } from "../../hooks/useThemeName";
import { BsFillSunFill, BsFillMoonFill } from "react-icons/bs";

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
    const [theme, setTheme] = useThemeName();

    const Icon = theme === "light" ? BsFillSunFill : BsFillMoonFill;

    return (
        <a
            className={className}
            onClick={() => {
                setTheme(theme === "light" ? "dark" : "light");
            }}
            style={{
                position: 'relative',
                top: '2px',
            }}
        >
            <Icon />
        </a>
    );
};