import * as React from "react";

import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import { HeadFC, PageProps, graphql } from "gatsby";

type DataProps = {
    markdownRemark: {
        title: string;
        slug: string;
        description: string;
    };
};

const WritingTemplate: React.FC<PageProps<DataProps>> = ({ data: { markdownRemark } }) => {
    return (
        <Layout>
            {JSON.stringify(markdownRemark, null, 2)}
        </Layout>
    );
};

export const Head: HeadFC = () => <SEO title="404: Not Found" />;

export const query = graphql`
  query ($id: String!) {
    markdownRemark(id: { eq: $id }) {
      frontmatter {
        description
        title
        slug
      }
    }
  }
`;

export default WritingTemplate;
