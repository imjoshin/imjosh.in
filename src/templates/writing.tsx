import * as React from "react";

import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import { HeadFC, PageProps, graphql } from "gatsby";

type DataProps = {
    markdownRemark: {
        frontmatter: {
            title: string;
            slug: string;
            description: string;
            date: string;
        };
        excerpt: string,
        html: string,
    };
};

const WritingTemplate: React.FC<PageProps<DataProps>> = ({ data: { markdownRemark } }) => {
    return (
        <Layout>
            <article
                className="blog-post"
                itemScope
                itemType="http://schema.org/Article"
            >
                <header>
                    <h1 itemProp="headline">{markdownRemark.frontmatter.title}</h1>
                    <p>{markdownRemark.frontmatter.date}</p>
                </header>
                <section
                    dangerouslySetInnerHTML={{ __html: markdownRemark.html }}
                    itemProp="articleBody"
                />
            </article>
            <nav className="blog-post-nav">
                <ul
                    style={{
                        display: `flex`,
                        flexWrap: `wrap`,
                        justifyContent: `space-between`,
                        listStyle: `none`,
                        padding: 0,
                    }}
                >
                </ul>
            </nav>
        </Layout>
    );
};

export const Head: HeadFC<DataProps> = ({ data: { markdownRemark } }) => <SEO
    title={markdownRemark.frontmatter.title}
    description={markdownRemark.frontmatter.description || markdownRemark.excerpt}
/>;

export const query = graphql`
  query ($id: String!) {
    markdownRemark(id: { eq: $id }) {
      html
      excerpt(pruneLength: 160)
      frontmatter {
        description
        title
        slug
        date(formatString: "MMMM DD, YYYY")
      }
    }
  }
`;

export default WritingTemplate;
