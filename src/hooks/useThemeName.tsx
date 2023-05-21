import React, { createContext, useState } from "react";
import { ThemeNameType } from "../themes";
import { useLocalStorage } from "./useLocalStorage";

const ThemeNameContext = createContext<
    [themeName: ThemeNameType, setThemeName: (themeName: ThemeNameType) => void]
>(["light", () => {}]);
const DEFAULT: ThemeNameType =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

function ThemeNameProvider({ children }: { children: React.ReactNode }) {
    const [themeName, setThemeName] = useLocalStorage("theme", DEFAULT);
    const themeNameCasted: ThemeNameType =
        themeName === "light" || themeName === "dark" ? themeName : "light";

    return (
        <ThemeNameContext.Provider value={[themeNameCasted, setThemeName]}>
            {children}
        </ThemeNameContext.Provider>
    );
}

function useThemeName() {
    const themeName = React.useContext(ThemeNameContext);
    if (themeName === undefined) {
        throw new Error("useThemeName must be used within a ThemeNameProvider");
    }

    return themeName;
}

export { ThemeNameProvider, useThemeName };
