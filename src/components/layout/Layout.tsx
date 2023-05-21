import React from "react"
import { useStaticQuery, graphql } from "gatsby"
import { useTheme } from "../../hooks/useTheme"
import { flattenThemeToCSS } from "../../util/theme"
import "./Layout.css"

const Layout = ({ children }) => {
  const theme = useTheme()
  const cssVariables = flattenThemeToCSS(theme)
  const style = {
    ...cssVariables,
  }

  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

  return (
    <div id="root" style={style} >
      {/* <Header siteTitle={data.site.siteMetadata?.title || `Title`} /> */}
      < div
        style={{
          margin: `0 auto`,
          maxWidth: `var(--size-content)`,
          padding: `var(--theme-size-space-5)`,
        }
        }
      >
        <main>{children} </main>
      </div>
    </div>
  )
}

export default Layout