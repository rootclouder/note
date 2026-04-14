import { useEffect } from 'react';
import { useStore } from '../store';

export function useTheme() {
  const { theme, toggleTheme } = useStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return { theme, toggleTheme };
}
