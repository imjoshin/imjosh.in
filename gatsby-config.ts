import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
    siteMetadata: {
        title: `Josh Johnson`,
        description: `Dive into the digital realm and explore Josh's software wizardry and artistic snapshots that will leave you inspired and in awe. Nah, I'm joshin', he's alright.`,
        author: `@imjosh_in`,
        siteUrl: `https://imjosh.in/`,
        image: `/images/ogimage.png`,
    },
    plugins: [
        `gatsby-plugin-image`,
        {
            resolve: `gatsby-source-filesystem`,
            options: {
                name: `images`,
                path: `${__dirname}/src/images`,
            },
        },
        `gatsby-transformer-sharp`,
        `gatsby-plugin-sharp`,
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
    ],
};

export default config;
