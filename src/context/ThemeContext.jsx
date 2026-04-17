import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('tmpm_theme') || 'system');

  useEffect(() => {
    localStorage.setItem('tmpm_theme', theme);
    
    const applyTheme = (currentTheme) => {
      const root = document.documentElement;
      root.classList.remove('dark', 'light');

      if (currentTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(systemPrefersDark ? 'dark' : 'light');
      } else {
        root.classList.add(currentTheme);
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
       const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
       const handleChange = () => applyTheme('system');
       mediaQuery.addEventListener('change', handleChange);
       return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const toggleTheme = () => {
     if (theme === 'dark') setTheme('light');
     else if (theme === 'light') setTheme('dark');
     else {
       const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
       setTheme(systemPrefersDark ? 'light' : 'dark');
     }
  };

  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
