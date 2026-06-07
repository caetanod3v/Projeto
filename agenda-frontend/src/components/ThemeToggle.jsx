import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
      <button
         type="button"
         onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
         className={`p-2.5 relative text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-sm dark:text-gray-300 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 ${className}`}
         title={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
      >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
