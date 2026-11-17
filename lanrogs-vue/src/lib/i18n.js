import { ROWS, EXTRA_ROWS } from './i18n-rows';

export const LANGS = [['en', 'English'], ['ru', 'Русский'], ['uz', 'Oʻzbekcha']];

const D = { ru: {}, uz: {} };
ROWS.concat(EXTRA_ROWS).forEach(function (r) { D.ru[r[0]] = r[1]; D.uz[r[0]] = r[2]; });

const KEY = 'lanrogs:lang';

// t('Card {0} of {1}', 3, 10) -> translated text with the numbers filled in
export function translate(lang, key, ...args) {
  const v = (D[lang] && D[lang][key]) || key;
  return String(v).replace(/\{(\d+)\}/g, function (m, i) { return args[i] !== undefined ? args[i] : m; });
}

// Browser only: the saved language, or the phone's language if we have it, else English.
export function detectLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || D[saved]) return saved;
    const n = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (D[n]) return n;
  } catch (e) { /* ignore */ }
  return 'en';
}

export function saveLang(l) {
  try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
}
