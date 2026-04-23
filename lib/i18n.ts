// Multi-language support system
export type Language = 'en' | 'es' | 'fr' | 'de' | 'ar';

export const translations = {
  en: {
    common: {
      welcome: 'Welcome',
      logout: 'Logout',
      loading: 'Loading',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
    },
    dashboard: {
      title: 'Welcome, ',
      subtitle: 'Manage your crypto investments',
      totalInvested: 'Total Invested',
      currentBalance: 'Current Balance',
      totalEarnings: 'Total Earnings',
      powaUpCredits: 'PowaUp Credits',
      buyMore: 'Buy More',
      loadingDashboard: 'Loading your dashboard...',
    },
    wallet: {
      title: 'Wallet',
      balance: 'Balance',
      deposit: 'Deposit',
      withdraw: 'Withdraw',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      darkMode: 'Dark Mode',
    },
  },
  es: {
    common: {
      welcome: 'Bienvenido',
      logout: 'Cerrar sesión',
      loading: 'Cargando',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Guardar',
      delete: 'Eliminar',
    },
    dashboard: {
      title: 'Bienvenido, ',
      subtitle: 'Administre sus inversiones en criptomonedas',
      totalInvested: 'Total Invertido',
      currentBalance: 'Saldo Actual',
      totalEarnings: 'Ganancias Totales',
      powaUpCredits: 'Créditos PowaUp',
      buyMore: 'Comprar Más',
      loadingDashboard: 'Cargando su panel...',
    },
    wallet: {
      title: 'Cartera',
      balance: 'Saldo',
      deposit: 'Depositar',
      withdraw: 'Retirar',
    },
    settings: {
      title: 'Configuración',
      language: 'Idioma',
      darkMode: 'Modo Oscuro',
    },
  },
  fr: {
    common: {
      welcome: 'Bienvenue',
      logout: 'Déconnexion',
      loading: 'Chargement',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      save: 'Enregistrer',
      delete: 'Supprimer',
    },
    dashboard: {
      title: 'Bienvenue, ',
      subtitle: 'Gérez vos investissements en crypto-monnaie',
      totalInvested: 'Total Investi',
      currentBalance: 'Solde Actuel',
      totalEarnings: 'Gains Totaux',
      powaUpCredits: 'Crédits PowaUp',
      buyMore: 'Acheter Plus',
      loadingDashboard: 'Chargement de votre tableau de bord...',
    },
    wallet: {
      title: 'Portefeuille',
      balance: 'Solde',
      deposit: 'Déposer',
      withdraw: 'Retirer',
    },
    settings: {
      title: 'Paramètres',
      language: 'Langue',
      darkMode: 'Mode Sombre',
    },
  },
  de: {
    common: {
      welcome: 'Willkommen',
      logout: 'Abmelden',
      loading: 'Wird geladen',
      error: 'Fehler',
      success: 'Erfolg',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      save: 'Speichern',
      delete: 'Löschen',
    },
    dashboard: {
      title: 'Willkommen, ',
      subtitle: 'Verwalten Sie Ihre Kryptowährungsinvestitionen',
      totalInvested: 'Gesamtinvestition',
      currentBalance: 'Aktueller Kontostand',
      totalEarnings: 'Gesamtverdienste',
      powaUpCredits: 'PowaUp-Guthaben',
      buyMore: 'Mehr Kaufen',
      loadingDashboard: 'Laden Sie Ihr Dashboard...',
    },
    wallet: {
      title: 'Geldbörse',
      balance: 'Kontostand',
      deposit: 'Einzahlen',
      withdraw: 'Abheben',
    },
    settings: {
      title: 'Einstellungen',
      language: 'Sprache',
      darkMode: 'Dunkler Modus',
    },
  },
  ar: {
    common: {
      welcome: 'أهلا وسهلا',
      logout: 'تسجيل الخروج',
      loading: 'جاري التحميل',
      error: 'خطأ',
      success: 'نجاح',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      save: 'حفظ',
      delete: 'حذف',
    },
    dashboard: {
      title: 'أهلا وسهلا، ',
      subtitle: 'إدارة استثماراتك في العملات المشفرة',
      totalInvested: 'إجمالي المستثمر',
      currentBalance: 'الرصيد الحالي',
      totalEarnings: 'إجمالي الأرباح',
      powaUpCredits: 'رصيد PowaUp',
      buyMore: 'شراء المزيد',
      loadingDashboard: 'جاري تحميل لوحة التحكم...',
    },
    wallet: {
      title: 'المحفظة',
      balance: 'الرصيد',
      deposit: 'إيداع',
      withdraw: 'سحب',
    },
    settings: {
      title: 'الإعدادات',
      language: 'اللغة',
      darkMode: 'الوضع المظلم',
    },
  },
};

export function getTranslation(lang: Language, path: string): string {
  const keys = path.split('.');
  let current: any = translations[lang];

  for (const key of keys) {
    current = current?.[key];
  }

  return current || path;
}
