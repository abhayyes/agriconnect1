import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Floating corner switch for theming. Anchored bottom-left so it clears the
 * chat launcher (bottom-right). Uses semantic color tokens, so the switch
 * recolors itself with the theme it controls.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="fixed bottom-5 left-5 z-[70] flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full bg-(--card)/90 backdrop-blur border border-(--line) text-(--muted) shadow-lg hover:border-(--leaf) group transition-colors cursor-pointer"
    >
      <Sun
        className={`w-4 h-4 transition-all ${
          isDark ? 'opacity-40 scale-90' : 'text-(--earth) opacity-100 scale-100'
        }`}
      />
      <div
        className={`relative w-11 h-6 rounded-full transition-colors ${
          isDark ? 'bg-(--leaf)' : 'bg-(--line)'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-(--card) shadow transition-transform ${
            isDark ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
      <Moon
        className={`w-4 h-4 transition-all ${
          isDark ? 'text-(--canvas) opacity-100 scale-100' : 'opacity-40 scale-90'
        }`}
      />
    </button>
  );
}