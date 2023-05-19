export type ThemeNameType = "dark" | "light"

const DEFAULT_THEME = {
    color: {
        black: '#000000',
        white: '#FFFFFF',
        primary: '#0000FF',
        background: '#FFFFFF',
        text: '#000000',
    }
}

export type ThemeType = typeof DEFAULT_THEME

export const themes: { [key: string]: ThemeType } = {
    light: {
        ...DEFAULT_THEME,
    },
    dark: {
        ...DEFAULT_THEME,
        color: {
            ...DEFAULT_THEME.color,
            primary: '#FF0000',
            background: '#000000',
            text: '#FFFFFF',
        }
    }
}