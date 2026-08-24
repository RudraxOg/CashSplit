import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={toggleTheme} className="rm-card w-10 h-10 flex items-center justify-center cursor-pointer theme-toggle">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>;
}
