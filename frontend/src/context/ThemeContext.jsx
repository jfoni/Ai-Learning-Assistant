import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'ai_assistant_theme_mode';

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const isDark = themeMode === 'dark';

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode, isDark]);

  const setTheme = (mode) => {
    setThemeMode(mode === 'dark' ? 'dark' : 'light');
  };

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      themeMode: 'light',
      isDark: false,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}