import React from "react"
import * as styles from "./RecentPosts.module.css"

interface RecentPostsProps {
    external: {
        excerpt: string,
        date: string,
        title: string,
        url: string,
    }[]
}

export const RecentPosts = ({ external }: RecentPostsProps) => {
    const posts = external.map(e => (
        <div>
            <a href={e.url} target="_blank" key={e.url}>{e.title}</a>
        </div>
    ))
    return (
        <div>
            {posts}
        </div>
    )
}