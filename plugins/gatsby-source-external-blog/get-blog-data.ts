import { GatsbyCache } from "gatsby";
import HTMLParser from "node-html-parser";

export type BlogType = {
    url: string,
    tags: string[],
}

type DataType = {
    url: string,
    tags: string[],
    title: string,
    excerpt: string | null,
    image: string | null,
    date: Date | null,
}

// TODO support other date formats
const dateRegex = /((January|February|March|April|May|June|July|August|September|October|November|December)\s+\d\d?[sthndr]{0,2},\s\d{4})/g

export const getBlogData = async (blog: BlogType, cache: GatsbyCache | undefined): Promise<DataType> => {
    const cacheKey = `external-blog-${blog.url}`

    const cachedBlog = await cache?.get(cacheKey)
    if (cachedBlog) {
        return cachedBlog
    }

    const data: DataType = {
        url: blog.url,
        tags: blog.tags,
        title: 'Unknown',
        excerpt: null,
        image: null, // TODO fetch a hero image
        date: null, // TODO fetch a date
    }

    const blogResponse = await fetch(blog.url);
    const blogText = await blogResponse.text()

    if (!blogText) {
        throw new Error("Failed to get response text")
    }

    const root = HTMLParser.parse(blogText)

    // Find the excerpt
    const bodyComponents = root.querySelectorAll('[class*="body"]')
    for (const component of bodyComponents) {
        const paragraphs = component.querySelectorAll('p').filter(p => !p.closest('blockquote'))

        // arbitrary number, I'd think most posts would have more than 2 p tags
        if (paragraphs.length > 2) {
            data.excerpt = paragraphs[0].innerText.trim()
        }
    }

    if (!data.excerpt) {
        const metaDescription = root.querySelector('meta[name="description"]')
        if (metaDescription) {
            data.excerpt = metaDescription.getAttribute('content')?.trim() || null
        }
    }

    // Find the title
    const title = root.querySelector('title')
    if (title) {
        data.title = title.innerHTML.split('|')[0].trim()
    } else {
        const urlParts = blog.url.split('/')
        const lastPath = urlParts[urlParts.length - 1].length ? urlParts[urlParts.length - 1] : urlParts[urlParts.length - 2]
        data.title = lastPath.replace(/[_-]/g, ' ')
            .trim()
            .split(' ')
            .map(w => w[0].toUpperCase() + w.substring(1).toLowerCase())
            .join(' ')
    }

    // Find the date
    // TODO make this more robust
    const bodyText = root.querySelector('body')!.innerHTML
    const dateMatches = bodyText.matchAll(dateRegex)

    for (const dateMatch of dateMatches) {
        let dateStr = dateMatch[0]

        if (dateStr) {
            // remove suffixes and commas from second part of date, i.e. "26th,"" -> "26"
            const dateParts = dateStr.split(/\s+/)
            dateParts[1] = parseInt(dateParts[1]).toString()
            dateStr = dateParts.join(' ')

            const date = new Date(dateStr)
            data.date = date
            break
        }

    }

    cache?.set(`external-blog-${blog.url}`, data)

    return data
}