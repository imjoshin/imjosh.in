import React from "react";
import "../../main.css";
import * as styles from "./Layout.module.css";
import { Navigation } from "../navigation";

const Layout = ({ children }) => {

    return (
        <div className={styles.container}>
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
