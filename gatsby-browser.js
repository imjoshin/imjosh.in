const React = require("react")
const { ThemeNameProvider } = require("./src/hooks/useThemeName")

exports.wrapRootElement = ({ element }) => {
    return (
        <ThemeNameProvider>
            {element}
        </ThemeNameProvider>
    )
}
