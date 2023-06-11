import * as React from "react";
import { Link, PageProps, graphql } from "gatsby";
import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";

type DataProps = {

};

const UsesPage: React.FC<PageProps<DataProps>> = ({ data, location }) => {
    return (
        <Layout>
            <h2>Things I use!</h2>
            <ul style={{ marginLeft: '32px', marginBottom: '16px' }}>
                <li>A computer.</li>
                <li>A camera.</li>
            </ul>
            <i>I'll update this I promise.</i>
        </Layout>
    );
};

export default UsesPage;

export const Head = () => <SEO title="Uses" />;

// export const pageQuery = graphql`
//   {

//   }
// `;