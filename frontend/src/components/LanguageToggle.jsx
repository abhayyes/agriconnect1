import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--card) border border-(--line) hover:border-(--leaf) text-xs font-semibold text-(--ink) transition-colors shadow-xs"
      title={language === 'en' ? 'Switch to Hindi' : 'अंग्रेज़ी में बदलें'}
    >
      <Languages className="w-4 h-4 text-(--leaf)" />
      <span className="hidden sm:inline">{language === 'en' ? 'हिंदी' : 'English'}</span>
      <div className="relative w-10 h-5 bg-(--line) rounded-full transition-colors">
        <div
          className={`absolute top-0.5 w-4 h-4 bg-(--leaf) rounded-full transition-transform ${
            language === 'hi' ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}
