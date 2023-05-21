import * as React from "react"
import { Link } from "gatsby"
import { StaticImage } from "gatsby-plugin-image"

import Layout from "../components/layout"
import { SEO } from "../components/seo"
import * as styles from "../components/index.module.css"
import { useThemeName } from "../hooks/useThemeName"

const IndexPage = () => {
  const [theme, setTheme] = useThemeName()

  return (
    <Layout>
      <div className={styles.textCenter}
        onClick={() => {
          setTheme(theme === "light" ? "dark" : "light")
          console.log("test")
        }}
      >
        <StaticImage
          src="../images/pixar1.png"
          loading="eager"
          width={175}
          quality={95}
          alt=""
          style={{ marginBottom: `var(--theme-space-3)` }}
        />
        <h1>
          Welcome to <b>imjosh.in</b>
        </h1>
      </div>
    </Layout>
  )
}

/**
 * Head export to define metadata for the page
 *
 * See: https://www.gatsbyjs.com/docs/reference/built-in-components/gatsby-head/
 */
export const Head = () => <SEO />

export default IndexPage
