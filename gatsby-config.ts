import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
    flags: {
        DEV_SSR: false,
    },
    siteMetadata: {
        title: `Josh Johnson`,
        description: `Dive into the digital realm and explore Josh's software wizardry and artistic snapshots that will leave you inspired and in awe. Nah, I'm joshin', he's alright.`,
        author: `@imjosh_in`,
        siteUrl: `https://imjosh.in/`,
        image: `/images/ogimage.png`,
    },
    plugins: [
        `gatsby-plugin-image`,
        `gatsby-transformer-sharp`,
        `gatsby-plugin-sharp`,
        'gatsby-plugin-use-dark-mode',
        {
            resolve: `gatsby-source-filesystem`,
            options: {
                name: `images`,
                path: `${__dirname}/src/images`,
            },
        },
        {
            resolve: `gatsby-plugin-manifest`,
            options: {
                name: `imjosh.in`,
                short_name: `imjosh.in`,
                start_url: `/`,
                background_color: `#663399`,
                // This will impact how browsers show your PWA/website
                // https://css-tricks.com/meta-theme-color-and-trickery/
                // theme_color: `#663399`,
                display: `minimal-ui`,
                icon: `src/images/favicon.png`, // This path is relative to the root of the site.
            },
        },
        {
            resolve: `gatsby-source-filesystem`,
            options: {
                path: `${__dirname}/content/writings`,
                name: `blog`,
            },
        },
        {
            resolve: `gatsby-transformer-remark`,
            options: {
                plugins: [
                    {
                        resolve: `gatsby-remark-images`,
                        options: {
                            maxWidth: 630,
                        },
                    },
                    {
                        resolve: `gatsby-remark-responsive-iframe`,
                        options: {
                            wrapperStyle: `margin-bottom: 1.0725rem`,
                        },
                    },
                    `gatsby-remark-prismjs`,
                ],
            },
        },
        {
            resolve: `gatsby-plugin-feed`,
            options: {
                query: `{
                    site {
                        siteMetadata {
                            title
                            description
                            siteUrl
                            site_url: siteUrl
                        }
                    }
                }`,
                feeds: [
                    {
                        serialize: ({ query: { site, allMarkdownRemark } }) => {
                            return allMarkdownRemark.nodes.map(node => {
                                return Object.assign({}, node.frontmatter, {
                                    description: node.excerpt,
                                    date: node.frontmatter.date,
                                    url: site.siteMetadata.siteUrl + 'writing' + node.frontmatter.slug,
                                    guid: site.siteMetadata.siteUrl + 'writing' + node.frontmatter.slug,
                                    custom_elements: [{ "content:encoded": node.html }],
                                });
                            });
                        },
                        query: `{
                            allMarkdownRemark(sort: {frontmatter: {date: DESC}}) {
                                nodes {
                                    excerpt
                                    html
                                    frontmatter {
                                        slug
                                        title
                                        date
                                    }
                                }
                            }
                        }`,
                        output: "/rss.xml",
                        title: "imjosh.in RSS Feed",
                    },
                ],
            },
        },
    ],
};

export default config;
