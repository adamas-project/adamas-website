import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { de } from './locale.de';

export type Lang = 'en' | 'de';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate an English source string; falls back to English if unmapped. */
  t: (s: string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: 'en', setLang: () => {}, t: (s) => s });

const STORAGE_KEY = 'adamas-lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'de' ? 'de' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((s: string) => (lang === 'de' ? de[s] ?? s : s), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): I18nCtx {
  return useContext(Ctx);
}
