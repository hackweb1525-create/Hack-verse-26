import React, { createContext, useContext, useState, ReactNode } from "react";
import { T, LangCode } from "./translations";

export type { LangCode } from "./translations";

export const LANGUAGES: { code: LangCode; label: string; native: string; ttsCode: string }[] = [
  { code: "en", label: "English", native: "English", ttsCode: "en-IN" },
  { code: "hi", label: "Hindi", native: "हिन्दी", ttsCode: "hi-IN" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", ttsCode: "kn-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", ttsCode: "te-IN" },
  { code: "ta", label: "Tamil", native: "தமிழ்", ttsCode: "ta-IN" },
];

type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  ttsCode: string;
  t: (key: string) => string;
};

const LanguageContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  ttsCode: "en-IN",
  t: (k) => k,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<LangCode>("en");
  const ttsCode = LANGUAGES.find((l) => l.code === lang)?.ttsCode || "en-IN";
  const t = (key: string) => T[lang]?.[key] ?? T.en[key] ?? key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, ttsCode, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
