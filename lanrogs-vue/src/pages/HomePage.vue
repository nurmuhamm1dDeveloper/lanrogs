<script setup>
import { computed, ref } from 'vue';
import { Store } from '../lib/store';
import { streak, uid } from '../lib/util';
import { S, configured, ready, t, toast, user } from '../app';

const flipped = ref(false);
const avg = computed(function () {
  const sc = S().scores;
  return sc.length ? Math.round(sc.reduce(function (a, x) { return a + (x.score / x.total) * 100; }, 0) / sc.length) + '%' : '-';
});
const guest = computed(function () { return configured() && !user(); });
const showStarter = computed(function () { return ready.value && S().cards.length === 0 && !guest.value; });

function seed() {
  const pairs = [['Hola', 'Hello'], ['Gracias', 'Thank you'], ['Agua', 'Water'], ['Casa', 'House'], ['Libro', 'Book'], ['Amigo', 'Friend']];
  Store.commit(function (st) {
    pairs.forEach(function (p) {
      st.cards.push({ id: uid(), lang: 'Spanish', front: p[0], image: '', back: p[1], note: '', known: false, createdAt: Date.now() });
    });
  });
  toast('Added 6 Spanish cards');
}
</script>

<template>
  <main>
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <h1 v-html="t('Learn any language, <span>one card</span> at a time.')"></h1>
          <p>{{ t('Make your own flashcards with words or pictures, turn them into quizzes, and keep everything safe in the cloud.') }}</p>
          <div class="hero-actions">
            <router-link class="btn btn-neon" to="/flashcards">{{ t('Start with flashcards') }}</router-link>
            <router-link class="btn btn-ghost" to="/quiz">{{ t('Take a quiz') }}</router-link>
            <router-link v-if="guest" class="btn btn-ghost" to="/login?mode=signup">{{ t('Create free account') }}</router-link>
          </div>
        </div>
        <div class="demo">
          <div class="flip" :class="{ flipped: flipped }" style="height: 240px" :title="t('Tap to flip')" @click="flipped = !flipped">
            <div class="flip-inner">
              <div class="face front"><span class="tag">{{ t('Spanish') }}</span><div class="word">Gracias</div><span class="hint">{{ t('tap to flip') }}</span></div>
              <div class="face back"><div class="word">Thank you</div><span class="hint">{{ t('tap to flip back') }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="container">
      <div class="stats">
        <div class="stat"><b>{{ S().cards.length }}</b><span>{{ t('Flashcards') }}</span></div>
        <div class="stat"><b>{{ S().quizzes.length }}</b><span>{{ t('Quizzes') }}</span></div>
        <div class="stat"><b>{{ avg }}</b><span>{{ t('Average score') }}</span></div>
        <div class="stat"><b>{{ streak() }}</b><span>{{ t('Day streak 🔥') }}</span></div>
      </div>
    </div>

    <section class="section">
      <div class="container">
        <h2>{{ t('Everything you need to practice') }}</h2>
        <div class="features">
          <div class="card feature"><div class="ico">&#127183;</div><h3>{{ t('Your own flashcards') }}</h3><p>{{ t('Add a word or a picture on the front and its translation on the back. Flip to check yourself.') }}</p><router-link to="/flashcards">{{ t('Open flashcards →') }}</router-link></div>
          <div class="card feature"><div class="ico">&#10067;</div><h3>{{ t('Quizzes you create') }}</h3><p>{{ t('Write your own multiple choice questions, or build a quiz from your flashcards in one click.') }}</p><router-link to="/quiz">{{ t('Open quizzes →') }}</router-link></div>
          <div class="card feature"><div class="ico">&#9729;&#65039;</div><h3>{{ t('Cloud memory') }}</h3><p>{{ t('Your cards, quizzes and scores sync to the cloud, so they follow you to every device.') }}</p><router-link to="/profile">{{ t('See your profile →') }}</router-link></div>
        </div>
      </div>
    </section>

    <section v-if="showStarter" class="section">
      <div class="container">
        <div class="empty">
          <h3>{{ t('Nothing here yet') }}</h3>
          <p>{{ t('Add your first flashcard, or load a small Spanish starter set to try everything out.') }}</p>
          <button class="btn" type="button" @click="seed">{{ t('Add sample cards') }}</button>
        </div>
      </div>
    </section>
  </main>
</template>
