import React from 'react';
import * as styles from "./Navigation.module.css";
import { Link } from 'gatsby';
import { ThemeToggle } from './theme-toggle';
import { StaticImage } from 'gatsby-plugin-image';

interface NavigationProps {

}

export const Navigation = ({ }: NavigationProps) => {
    return (
        <div className={styles.navigation}>
            <div className={styles.content}>
                <div>
                    <Link to="/">
                        <StaticImage
                            src="../../images/favicon.png"
                            loading="eager"
                            width={30}
                            quality={95}
                            alt=""
                            placeholder="blurred"
                        />
                    </Link>
                </div>
                <div>
                    <Link className={styles.link} to="/writing">Writing</Link>
                    <Link className={styles.link} to="/uses">Uses</Link>
                    {/* <Link className={styles.link} to="/">Talks</Link> */}
                    <a className={styles.link} target="_blank" href="https://www.jj.photos">Photography</a>
                    <ThemeToggle className={styles.link} />
                </div>
            </div>
        </div>
    );
};