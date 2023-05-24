import React from "react";
import * as styles from "./SpeechBubble.module.css";
import clsx from "clsx";

interface SpeechBubbleProps {
    children: React.ReactNode;
    className?: string;
}

export const SpeechBubble = ({ children, className }: SpeechBubbleProps) => {
    console.log(clsx(styles.bubble, className));
    return (
        <div className={clsx(styles.bubble, className)}>
            {children}
        </div>
    );
};