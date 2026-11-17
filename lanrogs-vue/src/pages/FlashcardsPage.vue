<script setup>
import { computed, reactive, ref } from 'vue';
import { Store } from '../lib/store';
import { bump, fileToDataURL, imgOK, shuffle, uid } from '../lib/util';
import { S, t, toast } from '../app';
import ModalBox from '../components/ModalBox.vue';
import FlipCard from '../components/FlipCard.vue';

const DEFAULT_LANGS = ['Spanish', 'English', 'Japanese', 'French', 'German', 'Russian', 'Turkish', 'Korean', 'Arabic'];

const search = ref('');
const lang = ref('');
const status = ref('');
const form = reactive({ open: false, id: null, lang: '', front: '', back: '', note: '', image: '' });
const fileKey = ref(0);
const study = ref(null); // { deck, di, got } while the study window is open

const langs = computed(function () {
  return Array.from(new Set(S().cards.map(function (c) { return c.lang; }).filter(Boolean))).sort();
});
const langValue = computed(function () { return langs.value.indexOf(lang.value) !== -1 ? lang.value : ''; });
const langOptions = computed(function () { return Array.from(new Set(DEFAULT_LANGS.concat(langs.value))); });

const list = computed(function () {
  const q = search.value.trim().toLowerCase();
  return S().cards.filter(function (c) {
    if (langValue.value && c.lang !== langValue.value) return false;
    if (status.value === 'known' && !c.known) return false;
    if (status.value === 'learning' && c.known) return false;
    if (q && [c.front, c.back, c.lang, c.note].join(' ').toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
});

// ----- add / edit -----
function openForm(card) {
  form.id = card ? card.id : null;
  form.lang = card ? card.lang || '' : langValue.value;
  form.front = card ? card.front || '' : '';
  form.back = card ? card.back || '' : '';
  form.note = card ? card.note || '' : '';
  form.image = card && imgOK(card.image) ? card.image : '';
  fileKey.value++;
  form.open = true;
}
function closeForm() { form.open = false; }

async function onFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try { form.image = await fileToDataURL(file); }
  catch (err) { toast(err.message, 'error'); }
}
function removeImage() { form.image = ''; fileKey.value++; }

function save() {
  const front = form.front.trim(), back = form.back.trim();
  if (!front && !form.image) return toast('Add a word or a picture for the front', 'error');
  if (!back) return toast('Add the translation for the back of the card', 'error');
  const data = { lang: form.lang.trim(), front: front, image: form.image, back: back, note: form.note.trim() };
  const editingId = form.id;
  Store.commit(function (st) {
    if (editingId) {
      const c = st.cards.filter(function (x) { return x.id === editingId; })[0];
      if (c) Object.assign(c, data);
    } else {
      st.cards.unshift(Object.assign({ id: uid(), known: false, createdAt: Date.now() }, data));
    }
    bump(st);
  });
  closeForm();
  toast(editingId ? 'Card updated' : 'Card added');
}

function toggleKnown(id) {
  Store.commit(function (st) { const c = st.cards.filter(function (x) { return x.id === id; })[0]; if (c) c.known = !c.known; });
}
function remove(id) {
  if (!window.confirm(t('Delete this flashcard?'))) return;
  Store.commit(function (st) { st.cards = st.cards.filter(function (c) { return c.id !== id; }); });
  toast('Card deleted');
}

// ----- study mode -----
function startStudy() {
  if (!list.value.length) return toast('Add some flashcards first', 'error');
  study.value = { deck: shuffle(list.value), di: 0, got: 0 };
}
function studyNext(gotIt) {
  const st0 = study.value;
  const card = st0.deck[st0.di];
  if (gotIt) {
    Store.commit(function (st) { const c = st.cards.filter(function (x) { return x.id === card.id; })[0]; if (c) c.known = true; bump(st); });
  }
  study.value = { deck: st0.deck, di: st0.di + 1, got: st0.got + (gotIt ? 1 : 0) };
}
function studyAgain() { study.value = { deck: shuffle(study.value.deck), di: 0, got: 0 }; }
</script>

<template>
  <main class="container">
    <div class="page-head">
      <h1>{{ t('Flashcards') }}</h1>
      <p class="muted">{{ t('Tap a card to flip it. Front: a word or picture. Back: the translation.') }}</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-neon" type="button" @click="openForm(null)">{{ t('+ New flashcard') }}</button>
      <button class="btn btn-ghost" type="button" @click="startStudy">{{ t('▶ Study') }}</button>
      <span class="spacer"></span>
      <input v-model="search" type="search" :placeholder="t('Search cards...')" :aria-label="t('Search cards')" />
      <select v-model="lang" :aria-label="t('Filter by language')">
        <option value="">{{ t('All languages') }}</option>
        <option v-for="l in langs" :key="l" :value="l">{{ l }}</option>
      </select>
      <select v-model="status" :aria-label="t('Filter by status')">
        <option value="">{{ t('All cards') }}</option>
        <option value="learning">{{ t('Still learning') }}</option>
        <option value="known">{{ t('Learned') }}</option>
      </select>
    </div>

    <div class="grid-cards">
      <div v-if="!S().cards.length" class="empty" style="grid-column: 1/-1">
        <h3>{{ t('No flashcards yet') }}</h3>
        <p v-html="t('Press <b>+ New flashcard</b> to add your first word or picture.')"></p>
      </div>
      <div v-if="S().cards.length && !list.length" class="empty" style="grid-column: 1/-1">
        <h3>{{ t('No cards match') }}</h3>
        <p>{{ t('Try a different search or filter.') }}</p>
      </div>
      <div v-for="c in list" :key="c.id" class="card-wrap">
        <FlipCard :c="c" hints />
        <div class="card-actions">
          <button class="chip" :class="{ on: c.known }" type="button" @click="toggleKnown(c.id)">&#10003; {{ t('Learned') }}</button>
          <button class="chip" type="button" @click="openForm(c)">{{ t('Edit') }}</button>
          <button class="chip danger" type="button" @click="remove(c.id)">{{ t('Delete') }}</button>
        </div>
      </div>
    </div>

    <ModalBox :open="form.open" title-id="cardTitle" :title="t(form.id ? 'Edit flashcard' : 'New flashcard')" @close="closeForm">
      <form autocomplete="off" @submit.prevent="save">
        <div class="field">
          <label for="fLang">{{ t('Language') }}</label>
          <input id="fLang" v-model="form.lang" type="text" list="langList" :placeholder="t('e.g. Spanish, Japanese, English')" />
          <datalist id="langList"><option v-for="l in langOptions" :key="l" :value="l"></option></datalist>
        </div>
        <div class="field">
          <label for="fFront">{{ t('Front: new word or phrase') }}</label>
          <input id="fFront" v-model="form.front" type="text" :placeholder="t('e.g. Gracias')" />
        </div>
        <div class="field">
          <label for="fImage">{{ t('...or a picture (optional)') }}</label>
          <input id="fImage" :key="fileKey" type="file" accept="image/*" @change="onFile" />
          <div v-if="form.image" class="preview">
            <img :src="form.image" :alt="t('Selected picture')" />
            <button type="button" class="link-red" @click="removeImage">{{ t('Remove picture') }}</button>
          </div>
        </div>
        <div class="field">
          <label for="fBack">{{ t('Back: translation') }}</label>
          <input id="fBack" v-model="form.back" type="text" :placeholder="t('e.g. Thank you')" />
        </div>
        <div class="field">
          <label for="fNote">{{ t('Example or note (optional)') }}</label>
          <input id="fNote" v-model="form.note" type="text" :placeholder="t('e.g. Muchas gracias por todo')" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="closeForm">{{ t('Cancel') }}</button>
          <button type="submit" class="btn">{{ t('Save card') }}</button>
        </div>
      </form>
    </ModalBox>

    <ModalBox :open="!!study" title-id="studyTitle" :title="t('Study')" @close="study = null">
      <div v-if="study" class="study-card">
        <div v-if="study.di >= study.deck.length" class="result">
          <div class="big">{{ study.got }}/{{ study.deck.length }}</div>
          <p>{{ t('cards marked as learned this session.') }}</p>
          <div class="study-actions">
            <button class="btn" type="button" @click="studyAgain">{{ t('Study again') }}</button>
            <button class="btn btn-ghost" type="button" @click="study = null">{{ t('Close') }}</button>
          </div>
        </div>
        <template v-else>
          <div class="progress"><i :style="{ width: Math.round((study.di / study.deck.length) * 100) + '%' }"></i></div>
          <p class="muted" style="text-align: center">{{ t('Card {0} of {1}', study.di + 1, study.deck.length) }}</p>
          <FlipCard :key="study.di" :c="study.deck[study.di]" />
          <div class="study-actions">
            <button class="btn btn-red" type="button" @click="studyNext(false)">{{ t('Again') }}</button>
            <button class="btn" type="button" @click="studyNext(true)">{{ t('Got it') }} &#10003;</button>
          </div>
        </template>
      </div>
    </ModalBox>
  </main>
</template>
