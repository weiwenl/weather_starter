import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ProviderProps } from '../types';

export const visualThemes = [
  { id: 'clear', label: 'Clear Morning' },
  { id: 'apple', label: 'Apple' },
  { id: 'storm', label: 'Storm' },
  { id: 'coastal', label: 'Coastal' },
  { id: 'alpine', label: 'Alpine Air' },
  { id: 'sunset', label: 'Sunset Gradient' },
  { id: 'solar', label: 'Solar' },
  { id: 'metro', label: 'Metro Forecast' },
] as const;

export type VisualThemeId = (typeof visualThemes)[number]['id'];

interface ThemeValue {
  themeId: VisualThemeId;
  setThemeId: (themeId: VisualThemeId) => void;
}

const DEFAULT_THEME: VisualThemeId = 'clear';
const STORAGE_KEY = 'weather-starter-theme';
const themeIds = new Set<VisualThemeId>(visualThemes.map((theme) => theme.id));

const ThemeContext = createContext<ThemeValue | null>(null);

function isVisualThemeId(value: string | null): value is VisualThemeId {
  return value !== null && themeIds.has(value as VisualThemeId);
}

function readStoredTheme(): VisualThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isVisualThemeId(stored) ? stored : DEFAULT_THEME;
}

export function ThemeProvider({ children }: ProviderProps) {
  const [themeId, setThemeId] = useState<VisualThemeId>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    window.localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId]);

  const value = useMemo(() => ({ themeId, setThemeId }), [themeId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
