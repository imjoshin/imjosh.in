import React from "react";

const ThemeScript = () => {
    const script = `
(function() {
    try {
        var darkMode = localStorage.getItem('darkMode');
        if (darkMode === null || darkMode === 'true') {
            document.body.classList.add('dark-mode');
        }
    } catch (e) {}
})();
`;
    return <script dangerouslySetInnerHTML={{ __html: script }} />;
};

export const onRenderBody = ({ setPreBodyComponents }) => {
    setPreBodyComponents([<ThemeScript key="theme-script" />]);
};
