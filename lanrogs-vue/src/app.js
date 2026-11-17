// Shared app state for all screens. Plain functions that read reactive values,
// so any template that calls them re-draws when the data changes:
//   t('text')  S() = saved data   user()   profile()
import { reactive, ref } from 'vue';
import { Auth, Store, init } from './lib/store';
import { detectLang, saveLang, translate } from './lib/i18n';

export const ready = ref(false);
export const rev = ref(0); // goes up whenever stored data / account / status changes
export const lang = ref('en');
export const toastState = reactive({ msg: '', type: '', show: false });

export function t(key, ...args) { return translate(lang.value, key, ...args); }
export function S() { rev.value; return Store.get(); }
export function user() { rev.value; return ready.value ? Auth.user() : null; }
export function profile() { rev.value; return Store.profile(); }
export function status() { rev.value; return Store.status(); }
export function configured() { return ready.value && Auth.configured(); }

let timer = null;
export function toast(msg, type) {
  toastState.msg = msg; toastState.type = type === 'error' ? 'error' : ''; toastState.show = true;
  clearTimeout(timer);
  timer = setTimeout(function () { toastState.show = false; }, 3200);
}

export function setLang(l) { saveLang(l); lang.value = l; document.documentElement.lang = l; }

const EVENTS = ['lanrogs:data', 'lanrogs:synced', 'lanrogs:profile', 'lanrogs:status', 'lanrogs:auth', 'lanrogs:signedout'];

export function boot() {
  init();
  lang.value = detectLang();
  document.documentElement.lang = lang.value;
  ready.value = true;
  EVENTS.forEach(function (n) { window.addEventListener(n, function () { rev.value++; }); });
  window.addEventListener('lanrogs:error', function (e) { toast(e.detail, 'error'); });
  // installable app + offline (production only)
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () { /* ignore */ });
  }
}
