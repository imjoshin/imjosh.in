import React from "react";
import { useThemeName } from "../../hooks/useThemeName";

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
    const [theme, setTheme] = useThemeName();

    return (
        <a
            className={className}
            onClick={() => {
                setTheme(theme === "light" ? "dark" : "light");
            }}
        >
            {theme}
        </a>
    );
};