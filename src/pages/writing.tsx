import * as React from "react";
import { Link, PageProps, graphql } from "gatsby";
import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";

type DataProps = {
    allMarkdownRemark: {
        nodes: {
            excerpt: string,
            frontmatter: {
                date: string,
                title: string,
                description: string,
                slug: string,
            }
        }[]
    }
    allExternalBlog: {
        nodes: {
            excerpt: string,
            date: string,
            title: string,
            url: string,
        }[]
    }
};

const WritingsPage: React.FC<PageProps<DataProps>> = ({ data, location }) => {
    const posts = data.allMarkdownRemark.nodes;
    const external = data.allExternalBlog.nodes;

    return (
        <Layout>
            <ol style={{ listStyle: `none` }}>
                {posts.map(post => {
                    const title = post.frontmatter.title || post.frontmatter.slug;

                    return (
                        <li key={post.frontmatter.slug}>
                            <article
                                className="post-list-item"
                                itemScope
                                itemType="http://schema.org/Article"
                            >
                                <header>
                                    <h2>
                                        <Link to={post.frontmatter.slug} itemProp="url">
                                            <span itemProp="headline">{title}</span>
                                        </Link>
                                    </h2>
                                    <small>{post.frontmatter.date}</small>
                                </header>
                                <section>
                                    <p
                                        dangerouslySetInnerHTML={{
                                            __html: post.frontmatter.description || post.excerpt,
                                        }}
                                        itemProp="description"
                                    />
                                </section>
                            </article>
                        </li>
                    );
                })}
                {external.map(post => {
                    const title = post.title;

                    return (
                        <li key={post.url}>
                            <article
                                className="post-list-item"
                                itemScope
                                itemType="http://schema.org/Article"
                            >
                                <header>
                                    <h2>
                                        <a href={post.url} target="_blank">
                                            <span itemProp="headline">{title}</span>
                                        </a>
                                    </h2>
                                    <small>{post.date}</small>
                                </header>
                                <section>
                                    <p
                                        dangerouslySetInnerHTML={{
                                            __html: post.excerpt,
                                        }}
                                        itemProp="description"
                                    />
                                </section>
                            </article>
                        </li>
                    );
                })}
            </ol>
        </Layout>
    );
};

export default WritingsPage;

export const Head = () => <SEO title="Writings" />;

export const pageQuery = graphql`
  {
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        excerpt
        frontmatter {
          date(formatString: "MMMM DD, YYYY")
          title
          description
          slug
        }
      }
    }
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