import React from 'react';
import * as styles from "./Navigation.module.css";
import { Link } from 'gatsby';
import { ThemeToggle } from './theme-toggle';

interface NavigationProps {

}

export const Navigation = ({ }: NavigationProps) => {
    return (
        <div className={styles.navigation}>
            <div className={styles.content}>
                <div className={styles.logo}>
                    Logo
                </div>
                <div className={styles.links}>
                    <Link className={styles.link} to="/">Writing</Link>
                    <Link className={styles.link} to="/">Talks</Link>
                    <Link className={styles.link} to="/">Photography</Link>
                    <ThemeToggle className={styles.link} />
                </div>
            </div>
        </div>
    );
};