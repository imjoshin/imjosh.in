import * as React from "react";

import Layout from "../components/layout/Layout";
import { PageProps } from "gatsby";

type ContextProps = {
    to: string;
};

const WritingTemplate: React.FC<PageProps<{}, ContextProps>> = ({
    pageContext: { to },
}) => {
    return (
        <Layout>
            <div style={{ textAlign: "center" }}>
                Redirecting to <a href={to}>{to}</a>...
            </div>
        </Layout>
    );
};

export default WritingTemplate;
