import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig } from '../types';
import { themeApi } from '../api/client';

interface ThemeContextValue {
  theme: ThemeConfig | null;
  isLoading: boolean;
  reload: () => Promise<void>;
  update: (updates: Partial<ThemeConfig>) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_THEME: ThemeConfig = {
  id: '',
  appName: 'Symptom Tracker',
  logoUrl: null,
  primaryColor: '#2563EB',
  secondaryColor: '#10B981',
  backgroundColor: '#F9FAFB',
  textColor: '#111827',
  headerBackground: '#1E3A5F',
  headerTextColor: '#FFFFFF',
  fontFamily: 'Inter',
  fontSizeBase: 16,
  buttonStyle: 'rounded',
  cardStyle: 'raised',
  showSeverityField: false,
  showNotesField: false,
  loginMessage: null,
  dashboardMessage: null,
  updatedAt: '',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = async () => {
    try {
      const t = await themeApi.get();
      setTheme(t);
      applyThemeToDocument(t);
    } catch {
      setTheme(DEFAULT_THEME);
    } finally {
      setIsLoading(false);
    }
  };

  const update = async (updates: Partial<ThemeConfig>) => {
    const updated = await themeApi.update(updates);
    setTheme(updated);
    applyThemeToDocument(updated);
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isLoading, reload, update }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyThemeToDocument(theme: ThemeConfig): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primaryColor);
  root.style.setProperty('--color-secondary', theme.secondaryColor);
  root.style.setProperty('--color-bg', theme.backgroundColor);
  root.style.setProperty('--color-text', theme.textColor);
  root.style.setProperty('--color-header-bg', theme.headerBackground);
  root.style.setProperty('--color-header-text', theme.headerTextColor);
  root.style.setProperty('--font-family', theme.fontFamily);
  root.style.setProperty('--font-size-base', `${theme.fontSizeBase}px`);
  document.title = theme.appName;

  // Load Google Font if needed
  const fontLink = document.getElementById('google-font') as HTMLLinkElement | null;
  const fontName = theme.fontFamily.replace(/ /g, '+');
  const href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`;
  if (fontLink) {
    fontLink.href = href;
  } else {
    const link = document.createElement('link');
    link.id = 'google-font';
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
