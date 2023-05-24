import * as React from "react";
import { HeadFC, Link, PageProps } from "gatsby";
import { StaticImage } from "gatsby-plugin-image";

import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import * as styles from "./index.module.css";
import { SpeechBubble } from "../components/speech-bubble/SpeechBubble";
import { Hero } from "../components/hero/Hero";

type IndexPageProps = {};

const IndexPage: React.FC<PageProps<IndexPageProps>> = () => {
    return (
        <Layout>
            <Hero />
        </Layout>
    );
};

export const Head: HeadFC<IndexPageProps> = () => <SEO />;

export default IndexPage;
