<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Auth } from '../lib/store';
import { configured, t } from '../app';

const router = useRouter();
const mode = ref('in'); // 'in' = log in, 'up' = create account
const msg = ref(null); // { text, type }
const recovery = ref(null);
const next = ref('/');
const busy = ref(false);
const name = ref('');
const email = ref('');
const pass = ref('');
const newPass = ref('');

function show(text, type) { msg.value = text ? { text: text, type: type || 'error' } : null; }

onMounted(function () {
  const qs = new URLSearchParams(window.location.search);
  let n = qs.get('next') || '/';
  if (!/^\/[a-z0-9-]*$/i.test(n)) n = '/'; // only our own pages
  next.value = n;

  // the password-reset e-mail link brings us back here with the token after the #
  const hs = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  let rec = null;
  if (hs.get('type') === 'recovery' && hs.get('access_token')) {
    rec = { access_token: hs.get('access_token'), refresh_token: hs.get('refresh_token'), expires_in: hs.get('expires_in') };
  }
  const hashError = hs.get('error_description');
  if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);

  if (rec) recovery.value = rec;
  if (hashError) show(hashError.replace(/\+/g, ' '));
  if (qs.get('mode') === 'signup') mode.value = 'up';
  if (Auth.configured() && Auth.user() && !rec) router.replace(n);
});

async function submit() {
  busy.value = true; show('');
  try {
    if (mode.value === 'in') {
      await Auth.signIn(email.value.trim(), pass.value);
      router.push(next.value);
    } else {
      const nm = name.value.trim();
      if (!nm) throw new Error('Please enter your name');
      const r = await Auth.signUp(email.value.trim(), pass.value, nm);
      if (r.signedIn) router.push(next.value);
      else show('Account created. Check your email and click the confirmation link, then log in.', 'ok');
    }
  } catch (err) { show(err.message); }
  busy.value = false;
}

async function forgot() {
  const em = email.value.trim();
  if (!em) return show('Type your email above first');
  try {
    await Auth.recover(em, window.location.origin + '/login');
    show('If an account exists for that email, a reset link is on its way.', 'ok');
  } catch (err) { show(err.message); }
}

async function resetPassword() {
  try {
    await Auth.finishRecovery(recovery.value, newPass.value);
    show('Password updated', 'ok');
    setTimeout(function () { router.replace('/'); }, 900);
  } catch (err) { show(err.message); }
}

function setMode(m) { mode.value = m; show(''); }
</script>

<template>
  <main class="container narrow">
    <div class="page-head">
      <h1>{{ t('Your account') }}</h1>
      <p class="muted">{{ t('Log in to see your flashcards, quizzes and profile on any device.') }}</p>
    </div>

    <div class="card auth-card">
      <div v-if="!configured()" class="notice">{{ t('Accounts are not connected yet. Set up Supabase (see README.md) to turn them on.') }}</div>

      <div v-if="configured() && !recovery" class="auth-tabs">
        <button type="button" :class="{ on: mode === 'in' }" @click="setMode('in')">{{ t('Log in') }}</button>
        <button type="button" :class="{ on: mode === 'up' }" @click="setMode('up')">{{ t('Create account') }}</button>
      </div>

      <div v-if="msg" class="msg" :class="msg.type" role="status">{{ t(msg.text) }}</div>

      <form v-if="configured() && !recovery" @submit.prevent="submit">
        <div v-if="mode === 'up'" class="field"><label for="aName">{{ t('Your name') }}</label><input id="aName" v-model="name" type="text" maxlength="60" autocomplete="name" /></div>
        <div class="field"><label for="aEmail">{{ t('Email') }}</label><input id="aEmail" v-model="email" type="email" required autocomplete="email" /></div>
        <div class="field"><label for="aPass">{{ t('Password') }}</label><input id="aPass" v-model="pass" type="password" required minlength="8" :autocomplete="mode === 'in' ? 'current-password' : 'new-password'" /></div>
        <button class="btn" type="submit" :disabled="busy">{{ t(mode === 'in' ? 'Log in' : 'Create account') }}</button>
        <p v-if="mode === 'in'" class="muted" style="margin: 16px 0 0"><button type="button" class="link-btn" @click="forgot">{{ t('Forgot your password?') }}</button></p>
      </form>

      <form v-if="configured() && recovery" @submit.prevent="resetPassword">
        <h3>{{ t('Choose a new password') }}</h3>
        <div class="field"><label for="newPass">{{ t('New password') }}</label><input id="newPass" v-model="newPass" type="password" required minlength="8" autocomplete="new-password" /></div>
        <button class="btn" type="submit">{{ t('Save new password') }}</button>
      </form>
    </div>
  </main>
</template>
