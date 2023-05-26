import { GatsbyNode } from "gatsby";
import { BlogType, getBlogData } from "./get-blog-data";

export const createSchemaCustomization: GatsbyNode["createSchemaCustomization"] = async ({ actions, graphql, reporter }) => {
    const { createTypes, createFieldExtension } = actions
    // createFieldExtension({
    //   name: 'shout',
    //   extend: () => ({
    //     resolve(source, args, context, info) {
    //       return String(source[info.fieldName]).toUpperCase()
    //     }
    //   })
    // })

    const typeDefs = `
      type ExternalBlog implements Node @dontInfer {
        title: String!
        url: String!
        excerpt: String
        date: Date @dateformat
        image: File @fileByRelativePath
        tags: [String!]
      }
    `
    createTypes(typeDefs)
}

export const sourceNodes: GatsbyNode["sourceNodes"] = async ({ actions, createNodeId, createContentDigest, reporter, cache }, options) => {
    const { createNode } = actions

    // TODO don't cast
    const blogs = options.blogs as BlogType[]

    const activity = reporter.activityTimer(`Getting external blog posts`)
    activity.setStatus(`0 / ${blogs.length}`)
    activity.start()

    for (let i = 0; i < blogs.length; i++) {
        const blog = blogs[i]

        try {
            const data = await getBlogData(blog, options.cache ? cache : undefined)

            const nodeContent = JSON.stringify(data)
            const nodeMeta = {
                id: createNodeId(`external-blog-${data.url}`),
                parent: null,
                children: [],
                internal: {
                    type: `ExternalBlog`,
                    content: nodeContent,
                    contentDigest: createContentDigest(data)
                }
            }

            const node = Object.assign({}, data, nodeMeta)
            await createNode(node)
        } catch (e) {
            reporter.error(`Failed to fetch ${blog.url}:\n  ${e.stack}`)
        }

        activity.setStatus(`${i + 1} / ${blogs.length}`)
    }

    activity.end()
}