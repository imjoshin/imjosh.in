import * as React from "react";

import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import { HeadFC, PageProps, graphql } from "gatsby";
import ReactPlayer from "react-player";
import * as styles from "./video.module.css";

type ContextProps = {
    file: string,
    title: string,
    song: {
        artist: string,
        title: string,
        url: string,
    };
};

const VideoTemplate: React.FC<PageProps<{}, ContextProps>> = ({ pageContext: { file, title, song } }) => {
    return (
        <Layout>
            <article
                className="blog-post"
                itemScope
                itemType="http://schema.org/Article"
            >
                <header>
                    <h1 itemProp="headline" className={styles.videoTitle}>{title}</h1>
                    <h3 className={styles.videoSong}>
                        <a href={song.url} target="_blank">
                            ♫ {song.title}, {song.artist} ♫
                        </a>
                    </h3>
                </header>
                <section itemProp="articleBody">
                    <div className={styles.video}>
                        <ReactPlayer url={`/${file}`} controls={true} />
                    </div>
                </section>
            </article>
            <nav className="blog-post-nav">
                <ul
                    style={{
                        display: `flex`,
                        flexWrap: `wrap`,
                        justifyContent: `space-between`,
                        listStyle: `none`,
                        padding: 0,
                    }}
                >
                </ul>
            </nav>
        </Layout>
    );
};

export const Head: HeadFC<{}, ContextProps> = ({ pageContext: { title } }) => <SEO
    title={title}
/>;

// export const query = graphql`
//   query ($id: String!) {
//     markdownRemark(id: { eq: $id }) {
//       html
//       excerpt(pruneLength: 160)
//       frontmatter {
//         description
//         title
//         slug
//         date(formatString: "MMMM DD, YYYY")
//       }
//     }
//   }
// `;

export default VideoTemplate;
