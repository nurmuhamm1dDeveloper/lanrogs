<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Auth, Store } from '../lib/store';
import { color, dayKey, fileToDataURL, imgOK, streak } from '../lib/util';
import { S, profile, status, t, toast, user } from '../app';
import AvatarBadge from '../components/AvatarBadge.vue';

const EMOJIS = ['😀', '😎', '🤓', '🦊', '🐼', '🐯', '🦁', '🐸', '🐙', '🦄', '🐧', '🦉', '🌸', '🌻', '🍀', '🔥', '⚡', '🌈', '🚀', '🎧', '🎮', '📚', '🎨', '⚽'];
const PRESETS = [['#06382a', '#0fa968'], ['#19e3ff', '#0a6b46'], ['#ff3b4e', '#7a1230'], ['#6a11cb', '#2575fc'],
  ['#f7971e', '#ffd200'], ['#232526', '#414345'], ['#ff9a9e', '#fad0c4'], ['#11998e', '#38ef7d']];

const router = useRouter();

function copyProfile(p) {
  return {
    display_name: p.display_name || '', native: p.native || '', learning: p.learning || '', goal: p.goal || 10,
    bio: p.bio || '', avatar: p.avatar || '', design: JSON.parse(JSON.stringify(p.design || {})),
  };
}

const draft = reactive(copyProfile(profile()));
let touched = false;
const saving = ref(false);
const avatarInput = ref(null);
const bannerInput = ref(null);

// the cloud copy arrived (e.g. a new device): refresh the form unless the person already started typing
watch(function () { return profile(); }, function (p) {
  if (!touched) Object.assign(draft, copyProfile(p));
});
// any change made by the person
function touch() { touched = true; }
function edit(fn) { touched = true; fn(); }

const acc = computed(function () { return color(draft.design.accent) || '#0fa968'; });
const colA = computed(function () { return color(draft.design.bannerA) || PRESETS[0][0]; });
const colB = computed(function () { return color(draft.design.bannerB) || PRESETS[0][1]; });
const hasCover = computed(function () { return imgOK(draft.design.bannerImage); });
const accStyle = computed(function () { return { '--accent': acc.value }; });
const bannerStyle = computed(function () {
  return { backgroundImage: hasCover.value ? 'url("' + draft.design.bannerImage + '")' : 'linear-gradient(135deg,' + colA.value + ',' + colB.value + ')' };
});
const sub = computed(function () {
  const n = draft.native.trim(), l = draft.learning.trim();
  return (n || l) ? ((n ? t('{0} speaker', n) : '') + (n && l ? ' · ' : '') + (l ? t('learning {0}', l) : '')) : t('Set up your profile below');
});

async function pickFile(e, kind) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    if (kind === 'avatar') { const img = await fileToDataURL(f, 256, true, 0.85); edit(function () { draft.avatar = img; }); }
    else { const img = await fileToDataURL(f, 1000, false, 0.72); edit(function () { draft.design.bannerImage = img; }); }
  } catch (err) { toast(err.message, 'error'); }
}
function setPreset(p) { edit(function () { draft.design.bannerA = p[0]; draft.design.bannerB = p[1]; draft.design.bannerImage = ''; }); }
function isPreset(p) { return !hasCover.value && p[0] === colA.value.toLowerCase() && p[1] === colB.value.toLowerCase(); }
function setColor(which, e) {
  const v = e.target.value;
  edit(function () {
    draft.design.bannerA = which === 'a' ? v : colA.value;
    draft.design.bannerB = which === 'b' ? v : colB.value;
    draft.design.bannerImage = '';
  });
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    await Store.saveProfile({
      display_name: draft.display_name.trim().slice(0, 60),
      native: draft.native.trim().slice(0, 60),
      learning: draft.learning.trim().slice(0, 120),
      goal: Math.min(500, Math.max(1, +draft.goal || 10)),
      bio: draft.bio.trim().slice(0, 200),
      avatar: draft.avatar || '',
      design: JSON.parse(JSON.stringify(draft.design)),
    });
    touched = false;
    toast('Profile saved');
  } catch (err) { toast(t('Could not save your profile') + ': ' + err.message, 'error'); }
  saving.value = false;
}

// ----- progress -----
const rows = computed(function () {
  const s = S(), sc = s.scores;
  const avg = sc.length ? Math.round(sc.reduce(function (x, y) { return x + (y.score / y.total) * 100; }, 0) / sc.length) + '%' : '-';
  return [
    ['\u{1F0CF}', t('{0} flashcards ({1} learned)', s.cards.length, s.cards.filter(function (c) { return c.known; }).length)],
    ['❓', t('{0} quizzes, {1} played', s.quizzes.length, sc.length)],
    ['\u{1F3AF}', t('Average score: {0}', avg)],
    ['\u{1F525}', t('{0} day streak', streak())],
  ];
});

// ----- cloud -----
const PILLS = { local: ['Local only', 'local'], idle: ['Ready', ''], syncing: ['Syncing...', 'syncing'], synced: ['Synced', ''], error: ['Sync problem', 'error'] };
const pill = computed(function () { return PILLS[status().state] || PILLS.idle; });
async function syncNow() {
  await Store.pull(); await Store.push();
  toast(Store.status().state === 'error' ? 'Sync failed' : 'Synced');
}

async function logout() {
  try { await Auth.signOut(); } catch (err) { /* ignore */ }
  router.push('/');
}
async function deleteAccount() {
  const v = window.prompt(t('This permanently deletes your account and everything saved in it. Type DELETE to confirm.'));
  if (v !== 'DELETE') return;
  try { await Auth.deleteAccount(); router.push('/'); }
  catch (err) { toast(err.message, 'error'); }
}

function exportBackup() {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(Store.get(), null, 2)], { type: 'application/json' }));
  link.download = 'lanrogs-backup-' + dayKey() + '.json';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
}
function importBackup(e) {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const r = new FileReader();
  r.onload = function () {
    try {
      const o = JSON.parse(r.result);
      if (!o || !Array.isArray(o.cards)) throw new Error('bad');
      if (!window.confirm(t('Replace your current data with this backup?'))) return;
      Store.replace(o); toast('Backup restored');
    } catch (err) { toast('That file is not a Lanrogs backup', 'error'); }
  };
  r.readAsText(f);
}
function resetAll() {
  if (!window.confirm(t('Erase ALL flashcards, quizzes and scores? This cannot be undone.'))) return;
  Store.reset(); toast('All data erased');
}
</script>

<template>
  <main class="container">
    <div class="page-head">
      <h1>{{ t('Profile') }}</h1>
      <p class="muted">{{ t('Your details, progress and cloud memory.') }}</p>
    </div>

    <div class="two-col" style="margin-top: 20px">
      <div>
        <div class="card pcard" :style="accStyle">
          <div class="banner" :style="bannerStyle">
            <button type="button" class="btn btn-small btn-neon banner-btn" @click="bannerInput.click()">&#128444; {{ t('Change cover') }}</button>
          </div>
          <div class="pbody">
            <div class="pavatar">
              <span><AvatarBadge :p="draft" :size="96" /></span>
              <button type="button" class="cam" :aria-label="t('Change profile picture')" @click="avatarInput.click()">&#128247;</button>
            </div>
            <h3 style="margin: 12px 0 0">{{ draft.display_name || t('Language learner') }}</h3>
            <span class="muted">{{ sub }}</span>
            <p class="muted" style="margin: 10px 0 0">{{ draft.bio }}</p>
          </div>
        </div>

        <form class="card" autocomplete="off" style="margin-top: 24px" @submit.prevent="save">
          <div class="field"><label for="name">{{ t('Your name') }}</label><input id="name" v-model="draft.display_name" type="text" maxlength="60" @input="touch()" /></div>
          <div class="row">
            <div class="field"><label for="native">{{ t('Native language') }}</label><input id="native" v-model="draft.native" type="text" maxlength="60" :placeholder="t('e.g. Uzbek')" @input="touch()" /></div>
            <div class="field"><label for="learning">{{ t('Learning') }}</label><input id="learning" v-model="draft.learning" type="text" maxlength="120" :placeholder="t('e.g. Japanese, English')" @input="touch()" /></div>
          </div>
          <div class="field"><label for="goal">{{ t('Daily goal (cards)') }}</label><input id="goal" v-model="draft.goal" type="number" min="1" max="500" @input="touch()" /></div>
          <div class="field"><label for="bio">{{ t('About me') }}</label><textarea id="bio" v-model="draft.bio" maxlength="200" :placeholder="t('A short line about you')" @input="touch()"></textarea></div>
          <button class="btn" type="submit" :disabled="saving">{{ t('Save profile') }}</button>
        </form>

        <div class="card" style="margin-top: 24px">
          <h3>{{ t('Progress') }}</h3>
          <ul class="contact-list">
            <li v-for="(r, i) in rows" :key="i"><span class="pill">{{ r[0] }}</span><span>{{ r[1] }}</span></li>
          </ul>
        </div>
      </div>

      <div>
        <div class="card" :style="accStyle">
          <h3>{{ t('Design your profile') }}</h3>

          <div class="field">
            <label>{{ t('Profile picture') }}</label>
            <div class="color-row">
              <button type="button" class="btn btn-ghost btn-small" @click="avatarInput.click()">{{ t('Upload picture') }}</button>
              <button v-if="draft.avatar" type="button" class="link-red" @click="edit(function () { draft.avatar = ''; })">{{ t('Remove picture') }}</button>
            </div>
            <input ref="avatarInput" type="file" accept="image/*" hidden @change="pickFile($event, 'avatar')" />
          </div>

          <div class="field">
            <label>{{ t('Or pick an icon') }}</label>
            <div class="emoji-grid">
              <button v-for="em in EMOJIS" :key="em" type="button" :class="{ on: draft.design.emoji === em }" :aria-label="em" @click="edit(function () { draft.design.emoji = em; })">{{ em }}</button>
            </div>
            <button type="button" class="link-btn" style="margin-top: 8px" @click="edit(function () { delete draft.design.emoji; })">{{ t('Use my initial') }}</button>
          </div>

          <div class="field">
            <label for="accent">{{ t('Accent color') }}</label>
            <input id="accent" type="color" :value="acc" @input="edit(function () { draft.design.accent = $event.target.value; })" />
          </div>

          <div class="field">
            <label>{{ t('Cover') }}</label>
            <p class="muted" style="font-size: 0.9rem; margin-bottom: 8px">{{ t('Pick a style') }}</p>
            <div class="swatches">
              <button v-for="(p, i) in PRESETS" :key="i" type="button" class="swatch" :class="{ on: isPreset(p) }" :aria-label="'Cover ' + (i + 1)" :style="{ background: 'linear-gradient(135deg,' + p[0] + ',' + p[1] + ')' }" @click="setPreset(p)"></button>
            </div>
            <p class="muted" style="font-size: 0.9rem; margin: 14px 0 8px">{{ t('Or choose your own colors') }}</p>
            <div class="color-row">
              <input type="color" :aria-label="t('Cover color 1')" :value="colA" @input="setColor('a', $event)" />
              <input type="color" :aria-label="t('Cover color 2')" :value="colB" @input="setColor('b', $event)" />
            </div>
            <div class="color-row" style="margin-top: 14px">
              <button type="button" class="btn btn-ghost btn-small" @click="bannerInput.click()">{{ t('Upload cover picture') }}</button>
              <button v-if="hasCover" type="button" class="link-red" @click="edit(function () { draft.design.bannerImage = ''; })">{{ t('Remove cover picture') }}</button>
            </div>
            <input ref="bannerInput" type="file" accept="image/*" hidden @change="pickFile($event, 'banner')" />
          </div>

          <button class="btn" type="button" :disabled="saving" @click="save">{{ t('Save profile') }}</button>
        </div>

        <div class="card" style="margin-top: 24px">
          <h3>{{ t('Cloud memory') }} <span class="pill" :class="pill[1]">{{ t(pill[0]) }}</span></h3>
          <div v-if="!Store.cloudConfigured()" class="notice">{{ t('Accounts are not connected yet. Your data is saved in this browser only. To turn accounts on, follow the steps in README.md.') }}</div>
          <div v-else>
            <p class="muted">{{ t('Your work is saved to your account automatically. Log in on any device to see it.') }}</p>
            <button class="btn btn-small" type="button" @click="syncNow">{{ t('Sync now') }}</button>
            <p style="color: var(--red-d); font-size: 0.85rem; margin: 10px 0 0">{{ status().state === 'error' ? status().msg : '' }}</p>
          </div>
        </div>

        <div v-if="user()" class="card" style="margin-top: 24px">
          <h3>{{ t('Account') }}</h3>
          <p class="muted">{{ t('Signed in as') }} <b>{{ user().email }}</b></p>
          <button class="btn btn-ghost btn-small" type="button" @click="logout">{{ t('Log out') }}</button>
        </div>

        <div class="card" style="margin-top: 24px">
          <h3>{{ t('Backup') }}</h3>
          <p class="muted">{{ t('Download all your cards, quizzes and scores, or restore them from a file.') }}</p>
          <div class="quiz-actions">
            <button class="btn btn-ghost btn-small" type="button" @click="exportBackup">{{ t('Download backup') }}</button>
            <label class="btn btn-ghost btn-small" style="cursor: pointer">{{ t('Restore from file') }}<input type="file" accept="application/json" hidden @change="importBackup" /></label>
          </div>
        </div>

        <div class="card danger-zone" style="margin-top: 24px">
          <h3>{{ t('Danger zone') }}</h3>
          <p class="muted">{{ t('Erase all flashcards, quizzes and scores (also from the cloud).') }}</p>
          <button class="btn btn-red btn-small" type="button" @click="resetAll">{{ t('Erase all data') }}</button>
          <div v-if="user()">
            <p class="muted" style="margin-top: 18px">{{ t('Permanently delete your account and everything saved in it.') }}</p>
            <button class="btn btn-red btn-small" type="button" @click="deleteAccount">{{ t('Delete my account') }}</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
