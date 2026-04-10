'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { Language } from '@/lib/i18n';
import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export function LanguageSwitcher() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  try {
    const { language, setLanguage } = useLanguage();

    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) {
      return null;
    }

    return (
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
        >
          <span className="text-base sm:text-lg">{languages.find(l => l.code === language)?.flag}</span>
          <span className="hidden sm:inline text-sm font-medium">{languages.find(l => l.code === language)?.label}</span>
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        <div className={`absolute right-0 mt-2 w-40 sm:w-48 bg-card border border-border rounded-lg shadow-lg transition-all z-50 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2 ${
                language === lang.code ? 'bg-primary/20 text-primary' : 'text-foreground'
              }`}
            >
              <span>{lang.flag}</span>
              <span className="truncate">{lang.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    // If LanguageProvider is not available, return null instead of throwing
    return null;
  }
}
