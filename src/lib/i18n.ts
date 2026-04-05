import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ka from '../locales/ka/translation.json';
import en from '../locales/en/translation.json';
import ru from '../locales/ru/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ka: { translation: ka },
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: localStorage.getItem('kalegroup-lang') || 'ka',
    fallbackLng: 'ka',
    interpolation: { escapeValue: false },
  });

export default i18n;
