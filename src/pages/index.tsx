import * as React from "react";
import { HeadFC, Link, PageProps } from "gatsby";
import { StaticImage } from "gatsby-plugin-image";

import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import * as styles from "./index.module.css";
import { useThemeName } from "../hooks/useThemeName";

type IndexPageProps = {};

const IndexPage: React.FC<PageProps<IndexPageProps>> = () => {
    const [theme, setTheme] = useThemeName();

    return (
        <Layout>
            <div
                className={styles.textCenter}
                onClick={() => {
                    setTheme(theme === "light" ? "dark" : "light");
                    console.log("test");
                }}
            >
                <StaticImage
                    src="../images/pixar1.png"
                    loading="eager"
                    width={175}
                    quality={95}
                    alt=""
                    style={{ marginBottom: `var(--theme-space-3)` }}
                />
                <h1>
                    Welcome to <b>imjosh.in</b>
                </h1>
            </div>
        </Layout>
    );
};

export const Head: HeadFC<IndexPageProps> = () => <SEO />;

export default IndexPage;
