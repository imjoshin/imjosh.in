import * as React from "react";
import { HeadFC, Link, PageProps, graphql } from "gatsby";
import { StaticImage } from "gatsby-plugin-image";

import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import * as styles from "./index.module.css";
import { SpeechBubble } from "../components/speech-bubble/SpeechBubble";
import { Hero } from "../components/hero/Hero";
import { RecentPosts } from "../components/recent-posts";

type DataProps = {
    allExternalBlog: {
        nodes: {
            excerpt: string,
            date: string,
            title: string,
            url: string,
        }[];
    };
};

const IndexPage: React.FC<PageProps<DataProps>> = ({ data }) => {
    console.log({ data });
    return (
        <Layout>
            <Hero />
            {/* <RecentPosts external={data.allExternalBlog.nodes} /> */}
        </Layout>
    );
};

export const Head: HeadFC<DataProps> = () => <SEO />;

export const pageQuery = graphql`
  {
    allExternalBlog(sort: { date: DESC } ) {
      nodes {
        excerpt
        date(formatString: "MMMM DD, YYYY")
        title
        url
      }
    }
  }
`;

export default IndexPage;
