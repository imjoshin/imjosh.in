import * as React from "react";
import { graphql } from "gatsby";
import { useSiteMetadata } from "../hooks/useSiteMetadata";

interface SEOProps {
    title?: string;
    description?: string;
    path?: string;
    children?: React.ReactNode;
}

export const SEO = ({ title, description, path, children }: SEOProps) => {
    const {
        title: defaultTitle,
        description: defaultDescription,
        image,
        siteUrl,
        author,
    } = useSiteMetadata();

    const finalTitle =
        !title || title === defaultTitle
            ? defaultTitle
            : `${title} | ${defaultTitle}`;

    const seo = {
        title: finalTitle,
        description: description || defaultDescription,
        image: `${siteUrl}${image}`,
        url: `${siteUrl}${path || ``}`,
        author,
    };

    console.log({ seo });

    return (
        <>
            <title>{seo.title}</title>
            <meta name="description" content={seo.description} />
            <meta name="image" content={seo.image} />
            <meta property="og:title" content={seo.title} />
            <meta property="og:description" content={seo.description} />
            <meta property="og:image" content={seo.image} />
            <meta property="og:url" content={seo.url} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seo.title} />
            <meta name="twitter:url" content={seo.url} />
            <meta name="twitter:description" content={seo.description} />
            <meta name="twitter:image" content={seo.image} />
            <meta name="twitter:creator" content={seo.author} />
            {children}
        </>
    );
};
