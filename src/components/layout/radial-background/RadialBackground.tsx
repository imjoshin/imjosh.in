import React from "react";
import * as styles from "./RadialBackground.module.css";
import useMouse from '@react-hook/mouse-position';
import useMousePosition from "../../../hooks/useMousePosition";

export const RadialBackground = () => {
    const mouse = useMousePosition();

    const style = {
        '--bg-pos-x': `${mouse.x}px`,
        '--bg-pos-y': `${mouse.y}px`,
    } as React.CSSProperties;

    return mouse.x !== null && (
        <div className={styles.background} style={style}>

        </div>
    );
};