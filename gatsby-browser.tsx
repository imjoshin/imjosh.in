import React from "react";
import { ThemeNameProvider } from "./src/hooks/useThemeName";
import type { GatsbyBrowser } from "gatsby";

export const wrapRootElement: GatsbyBrowser["wrapPageElement"] = ({
    element,
}) => {
    return <ThemeNameProvider>{element}</ThemeNameProvider>;
};
