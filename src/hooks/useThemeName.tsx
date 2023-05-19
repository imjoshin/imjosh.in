import React, { createContext, useState } from 'react';
import { ThemeNameType } from '../themes';


const ThemeNameContext = createContext<[themeName: ThemeNameType, setThemeName: (themeName: ThemeNameType) => void]>(["light", () => {}]);

function ThemeNameProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeNameType>("light");

  return (
    <ThemeNameContext.Provider value={[themeName, setThemeName]}>
      {children}
    </ThemeNameContext.Provider>
  );
}

function useThemeName() {
  const themeName = React.useContext(ThemeNameContext);
  if (themeName === undefined) {
    throw new Error('useThemeName must be used within a ThemeNameProvider');
  }

  return themeName;
}

export { ThemeNameProvider, useThemeName };