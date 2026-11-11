import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: 'dark', setTheme: () => {} });

function readStored(fallback: Theme): Theme {
  try {
    const v = localStorage.getItem('theme');
    return v === 'light' || v === 'dark' ? v : fallback;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: { children: ReactNode; defaultTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(() => readStored(defaultTheme));
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* storage blocked: theme still applies for this page view */
    }
  }, [theme]);
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
