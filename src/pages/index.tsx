import * as React from "react";
import { HeadFC, Link, PageProps } from "gatsby";
import { StaticImage } from "gatsby-plugin-image";

import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import * as styles from "./index.module.css";
import { useThemeName } from "../hooks/useThemeName";

type IndexPageProps = {};

const IndexPage: React.FC<PageProps<IndexPageProps>> = () => {
  return (
    <Layout>
      <div className={styles.textCenter}>
        <StaticImage
          src="../images/pixar1.png"
          loading="eager"
          width={175}
          quality={95}
          alt=""
          style={{ marginBottom: `var(--theme-space-3)` }}
        />
        <h1>
          I'm <b>joshin</b>
        </h1>
      </div>
    </Layout>
  );
};

export const Head: HeadFC<IndexPageProps> = () => <SEO />;

export default IndexPage;
