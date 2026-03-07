import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./es.json";
import en from "./en.json";
import gl from "./gal.json";

// Priority: 1) user saved preference, 2) browser language, 3) default "es"
const browserLang = navigator.language?.slice(0, 2) ?? "es";
const supportedLangs = ["es", "en", "gl"];
const savedLang = localStorage.getItem("language")
  ?? (supportedLangs.includes(browserLang) ? browserLang : "es");

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    gl: { translation: gl },
  },
  lng: savedLang,
  fallbackLng: "es",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
