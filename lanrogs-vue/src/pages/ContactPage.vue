<script setup>
import { ref, watch } from 'vue';
import { Cloud, Store, config } from '../lib/store';
import { profile, t, toast, user } from '../app';

const c = config();
const name = ref('');
const email = ref('');
const message = ref('');
const website = ref(''); // hidden trap field for spam bots
const busy = ref(false);

// logged-in people don't have to type their details again
watch(function () { return [user(), profile()]; }, function () {
  const u = user();
  if (!u) return;
  if (!email.value) email.value = u.email || '';
  if (!name.value) name.value = profile().display_name || '';
}, { immediate: true });

async function submit() {
  if (website.value) { toast('Message sent. Thank you!'); message.value = ''; return; } // a bot filled the trap field
  const nm = name.value.trim().slice(0, 120), em = email.value.trim().slice(0, 200), msg = message.value.trim().slice(0, 4000);
  const u = user();
  const jobs = [];
  // 1) saved in the database: the admin sees it on the Admin page
  if (Store.cloudConfigured()) {
    jobs.push(Cloud.request('messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: { name: nm, email: em, message: msg, user_id: u ? u.id : null } }));
  }
  // 2) e-mailed to the owner through the private endpoint
  if (c.contactEndpoint) {
    jobs.push(fetch(c.contactEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ name: nm, email: em, message: msg, _subject: 'Lanrogs message from ' + nm, _replyto: em, _template: 'table' }),
    }).then(async function (r) {
      let j = {}; try { j = await r.json(); } catch (x) { /* ignore */ }
      if (!r.ok || j.success === 'false' || j.success === false) throw new Error(j.message || 'failed');
    }));
  }
  if (!jobs.length) return toast('Contact is not set up yet. Add VITE_CONTACT_ENDPOINT in the site settings.', 'error');

  busy.value = true;
  const res = await Promise.allSettled(jobs);
  if (res.some(function (x) { return x.status === 'fulfilled'; })) {
    toast('Message sent. Thank you!'); message.value = '';
    if (!u) { name.value = ''; email.value = ''; }
  } else toast('Could not send the message. Please try again.', 'error');
  busy.value = false;
}
</script>

<template>
  <main class="container">
    <div class="page-head">
      <h1>{{ t('Contact') }}</h1>
      <p class="muted">{{ t('Questions, ideas or bugs? Send a message.') }}</p>
    </div>

    <div class="two-col" style="margin-top: 20px">
      <form class="card" @submit.prevent="submit">
        <div class="field"><label for="cName">{{ t('Your name') }}</label><input id="cName" v-model="name" type="text" name="name" maxlength="120" required /></div>
        <div class="field"><label for="cEmail">{{ t('Your email') }}</label><input id="cEmail" v-model="email" type="email" name="email" maxlength="200" required /></div>
        <div class="field"><label for="cMsg">{{ t('Message') }}</label><textarea id="cMsg" v-model="message" name="message" maxlength="4000" required></textarea></div>
        <div class="hp" aria-hidden="true"><input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" /></div>
        <button class="btn" type="submit" :disabled="busy">{{ busy ? t('Sending...') : t('Send message') }}</button>
      </form>

      <div class="card">
        <h3>{{ t('Get in touch') }}</h3>
        <ul class="contact-list">
          <li><span class="pill">&#9993;</span><span>{{ t('Your message goes straight to the Lanrogs team.') }}</span></li>
          <li v-if="c.githubUrl">
            <span class="pill">&#128025;</span>
            <span class="muted"><a :href="c.githubUrl" target="_blank" rel="noopener noreferrer">{{ c.githubUrl.replace(/^https?:\/\//, '') }}</a></span>
          </li>
          <li><span class="pill">&#128161;</span><span>{{ t('Suggest a feature or a language you want to see.') }}</span></li>
        </ul>
      </div>
    </div>
  </main>
</template>
