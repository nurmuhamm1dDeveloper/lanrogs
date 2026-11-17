<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Auth } from '../lib/store';
import { LANGS } from '../lib/i18n';
import { configured, lang, profile, setLang, t, toast, user } from '../app';
import LogoMark from './LogoMark.vue';
import AvatarBadge from './AvatarBadge.vue';

const PAGES = [['/', 'Home'], ['/quiz', 'Quiz'], ['/flashcards', 'Flashcards'], ['/contact', 'Contact'], ['/profile', 'Profile']];
const route = useRoute();
const router = useRouter();
const open = ref(false);
const canInstall = ref(false);
const loggingOut = ref(false);
let deferred = null;

// close the phone menu after moving to another page
watch(function () { return route.path; }, function () { open.value = false; });

function onPrompt(e) { e.preventDefault(); deferred = e; }
function onInstalled() { canInstall.value = false; }

onMounted(function () {
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  canInstall.value = !standalone;
  window.addEventListener('beforeinstallprompt', onPrompt);
  window.addEventListener('appinstalled', onInstalled);
});
onBeforeUnmount(function () {
  window.removeEventListener('beforeinstallprompt', onPrompt);
  window.removeEventListener('appinstalled', onInstalled);
});

function install() {
  if (deferred) { deferred.prompt(); deferred = null; }
  else toast('To install: open your browser menu and choose "Install app" or "Add to Home Screen".');
}
async function logout() {
  loggingOut.value = true;
  try { await Auth.signOut(); } catch (e) { /* ignore */ }
  loggingOut.value = false;
  router.push('/');
}
function login() { router.push({ path: '/login', query: { next: route.path } }); }
function changeLang(e) { setLang(e.target.value); }
</script>

<template>
  <header class="site-header">
    <div class="container nav">
      <router-link class="brand" to="/" :aria-label="t('Lanrogs home')">
        <LogoMark :size="42" /><span>Lan<b>rogs</b></span>
      </router-link>
      <button class="burger" type="button" :aria-label="t('Open menu')" :aria-expanded="open" @click="open = !open">&#9776;</button>
      <nav class="links" :class="{ open: open }" id="navlinks">
        <router-link v-for="p in PAGES" :key="p[0]" :to="p[0]" :class="{ active: p[0] === route.path }">{{ t(p[1]) }}</router-link>
        <span class="acct">
          <button v-if="configured() && !user()" class="btn btn-small" type="button" @click="login">{{ t('Log in') }}</button>
          <template v-if="configured() && user()">
            <router-link v-if="profile().role === 'admin'" to="/admin" :class="{ active: route.path === '/admin' }">{{ t('Admin') }}</router-link>
            <router-link class="me" to="/profile" :aria-label="t('Profile')"><AvatarBadge :p="profile()" :size="38" /></router-link>
            <button class="btn btn-ghost btn-small" type="button" :disabled="loggingOut" @click="logout">{{ t('Log out') }}</button>
          </template>
        </span>
        <select class="lang-sel" :aria-label="t('Language')" :value="lang" @change="changeLang">
          <option v-for="l in LANGS" :key="l[0]" :value="l[0]">{{ l[1] }}</option>
        </select>
        <button v-if="canInstall" class="btn btn-small btn-neon" type="button" @click="install">{{ t('Install app') }}</button>
      </nav>
    </div>
  </header>
</template>
