'use client';

import React, { createContext, useState, useCallback, useEffect } from 'react';
import { Language, getTranslation } from '@/lib/i18n';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const defaultContextValue: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: (path: string) => {
    const parts = path.split('.');
    return parts[parts.length - 1] || path;
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isClient, setIsClient] = useState(false);

  // Initialize on client side
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language || 'en';
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  }, []);

  const t = useCallback((path: string) => {
    return getTranslation(language, path);
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
