'use client';

import { useContext } from 'react';
import { LanguageContext, LanguageContextType } from '@/context/LanguageContext';

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    // Provide a fallback when used outside LanguageProvider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (path: string) => {
        // Simple fallback - just return the path or a default message
        const parts = path.split('.');
        return parts[parts.length - 1] || path;
      }
    };
  }
  return context;
}
