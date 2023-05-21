export type ThemeNameType = "dark" | "light"

const DEFAULT_THEME = {
    color: {
        black: '#000000',
        white: '#FFFFFF',
        primary: '#0000FF',
        background: '#FFFFFF',
        text: '#000000',
    },
    font: {
        large: '18px',
        medium: '16px',
        small: '14px',
        xsmall: '12px',
    },
    size: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '16px',
        'space-4': '24x',
        'space-5': '32px',
        'space-6': '64px',
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