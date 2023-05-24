import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { BsFillSunFill, BsFillMoonFill } from "react-icons/bs";
import useDarkMode from "use-dark-mode";

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
    const [dummyClass, setDummyClass] = useState('');
    const darkMode = useDarkMode(true);
    const Icon = darkMode.value ? BsFillMoonFill : BsFillSunFill;

    useEffect(() => {
        setTimeout(() => {
            setDummyClass('rendered');
        }, 500);
    });

    return (
        <a
            className={clsx(className, dummyClass)}
            onClick={darkMode.toggle}
            style={{
                position: 'relative',
                top: '2px',
            }}
        >
            <Icon className={clsx(dummyClass)} />
        </a>
    );
};