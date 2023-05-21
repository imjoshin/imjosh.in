import React from "react";
import { useStaticQuery, graphql } from "gatsby";
import { useTheme } from "../../hooks/useTheme";
import { flattenThemeToCSS } from "../../util/theme";
import "../../main.css";
import * as styles from "./Layout.module.css";
import { Navigation } from "../navigation";

const Layout = ({ children }) => {
    const theme = useTheme();
    const cssVariables = flattenThemeToCSS(theme);
    const style = {
        ...cssVariables,
    };

    const data = useStaticQuery(graphql`
        query SiteTitleQuery {
            site {
                siteMetadata {
                    title
                }
            }
        }
    `);

    return (
        <div className={styles.container} style={style}>
            <Navigation />
            <div className={styles.body}>
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
