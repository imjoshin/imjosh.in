import * as React from "react";

import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import { HeadFC } from "gatsby";

const NotFoundPage = () => (
    <Layout>
        <h1>404: Not Found</h1>
        <p>You just hit a route that doesn&#39;t exist...</p>
    </Layout>
);

export const Head: HeadFC = () => <SEO title="404: Not Found" />;

export default NotFoundPage;
