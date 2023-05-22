import { GatsbyNode } from "gatsby";
import path from "path";


type MarkdownRemarkNodes = {
    allMarkdownRemark: {
        nodes: {
            id: string,
            frontmatter: {
                slug: string,
            };
        }[];
    };
};

const writingTemplate = path.resolve(`src/templates/writing.tsx`);


export const createPages: GatsbyNode["createPages"] = async ({ actions, graphql, reporter }) => {
    const { createPage } = actions;

    const result = await graphql<MarkdownRemarkNodes>(`
    {
        allMarkdownRemark(sort: { frontmatter: { date: ASC } }, limit: 1000) {
            nodes {
                id
                frontmatter {
                    slug
                }
            }
        }
    }`);

    if (result.errors || !result.data) {
        reporter.panicOnBuild(
            `There was an error loading your blog posts`,
            result.errors
        );
        return;
    }

    const posts = result.data.allMarkdownRemark.nodes;

    if (posts.length > 0) {
        posts.forEach((post, index) => {
            const previousPostId = index === 0 ? null : posts[index - 1].id;
            const nextPostId = index === posts.length - 1 ? null : posts[index + 1].id;

            createPage({
                path: `writing/${post.frontmatter.slug}`,
                component: writingTemplate,
                context: {
                    id: post.id,
                    previousPostId,
                    nextPostId,
                },
            });
        });
    }
};
