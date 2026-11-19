import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = 'ai_assistant_theme_mode';

const DARK_BOLD_STYLE_ID = 'ai-assistant-dark-bold-style';

const ensureDarkBoldStyle = (enabled) => {
  let styleEl = document.getElementById(DARK_BOLD_STYLE_ID);
  if (!enabled) {
    if (styleEl) styleEl.remove();
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = DARK_BOLD_STYLE_ID;
    document.head.appendChild(styleEl);
  }

  // Boost font weight across dark mode while preserving existing colors
  styleEl.textContent = `
    html[data-theme="dark"] body,
    html.dark body {
      font-weight: 600;
    }
    html[data-theme="dark"] p,
    html[data-theme="dark"] span,
    html[data-theme="dark"] label,
    html[data-theme="dark"] li,
    html[data-theme="dark"] a,
    html[data-theme="dark"] button,
    html[data-theme="dark"] input,
    html[data-theme="dark"] select,
    html[data-theme="dark"] textarea,
    html.dark p,
    html.dark span,
    html.dark label,
    html.dark li,
    html.dark a,
    html.dark button,
    html.dark input,
    html.dark select,
    html.dark textarea {
      font-weight: 700;
    }
    html[data-theme="dark"] h1,
    html[data-theme="dark"] h2,
    html[data-theme="dark"] h3,
    html[data-theme="dark"] h4,
    html[data-theme="dark"] strong,
    html.dark h1,
    html.dark h2,
    html.dark h3,
    html.dark h4,
    html.dark strong {
      font-weight: 800;
    }
  `;
};

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

    ensureDarkBoldStyle(isDark);
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