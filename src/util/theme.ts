import { ThemeType } from "../themes"


const flattenThemeToCSSInner = (themeLevel: object, varPrefix: string) => {
    let cssVariables = {}

    for (const [key, value] of Object.entries(themeLevel)) {
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            cssVariables = {
                ...flattenThemeToCSSInner(value, `${varPrefix}-${key}`),
                ...cssVariables,
            }
        } else {
            cssVariables[`${varPrefix}-${key}`] = value
        }
    }

    return cssVariables
}

export const flattenThemeToCSS = (theme: ThemeType) => {
    return flattenThemeToCSSInner(theme, '--theme')
}