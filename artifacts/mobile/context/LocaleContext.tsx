import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGES, languageLabel, type LanguageOption } from '@/constants/languages';
import { localeHasFullPack, translate, type I18nKey } from '@/lib/i18n';

const LOCALE_KEY = 'flux_locale';
const DEFAULT_LOCALE = 'en';

interface LocaleContextType {
  locale: string;
  localeReady: boolean;
  languages: LanguageOption[];
  setLocale: (code: string) => Promise<void>;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
  currentLanguageLabel: string;
  hasFullTranslation: boolean;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [localeReady, setLocaleReady] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCALE_KEY);
        if (stored && LANGUAGES.some((l) => l.code === stored)) {
          setLocaleState(stored);
        }
      } finally {
        setLocaleReady(true);
      }
    })();
  }, []);

  const setLocale = useCallback(async (code: string) => {
    const next = LANGUAGES.some((l) => l.code === code) ? code : DEFAULT_LOCALE;
    setLocaleState(next);
    await AsyncStorage.setItem(LOCALE_KEY, next);
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo<LocaleContextType>(
    () => ({
      locale,
      localeReady,
      languages: LANGUAGES,
      setLocale,
      t,
      currentLanguageLabel: languageLabel(locale),
      hasFullTranslation: localeHasFullPack(locale),
    }),
    [locale, localeReady, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
