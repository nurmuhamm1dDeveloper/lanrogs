<script setup>
import { ref } from 'vue';
import { Store } from '../lib/store';
import { bump, fileToDataURL, imgOK, shuffle, uid } from '../lib/util';
import { S, t, toast } from '../app';
import ModalBox from '../components/ModalBox.vue';

const Q_PLACEHOLDER = 'Question, e.g. What does "gracias" mean?';
const LETTERS = 'ABCD';

function newQuestion() { return { id: uid(), text: '', img: '', opts: ['', '', '', ''], correct: 0 }; }
// the answer buttons of one question, shuffled
function makeOptions(quiz, i) {
  const q = quiz.questions[i];
  return shuffle(q.options.map(function (text, j) { return { t: text, ok: j === q.answer }; }));
}

const makeOpen = ref(false);
const title = ref('');
const qlang = ref('');
const qs = ref([newQuestion(), newQuestion()]);
const play = ref(null); // { quiz, qi, score, picked, opts, done }

function best(id) {
  const sc = S().scores.filter(function (x) { return x.quizId === id; });
  if (!sc.length) return null;
  return Math.max.apply(null, sc.map(function (x) { return Math.round((x.score / x.total) * 100); }));
}

// ----- build a quiz -----
function openMake() { title.value = ''; qlang.value = ''; qs.value = [newQuestion(), newQuestion()]; makeOpen.value = true; }
function removeQ(id) {
  if (qs.value.length > 1) qs.value = qs.value.filter(function (q) { return q.id !== id; });
  else toast('A quiz needs at least one question', 'error');
}
async function onQFile(q, e) {
  const f = e.target.files && e.target.files[0];
  if (!f) { q.img = ''; return; }
  try { q.img = await fileToDataURL(f, 360); }
  catch (err) { toast(err.message, 'error'); }
}

function saveQuiz() {
  const name = title.value.trim();
  if (!name) return toast('Give your quiz a title', 'error');
  const questions = [];
  for (let n = 0; n < qs.value.length; n++) {
    const d = qs.value[n], text = d.text.trim(), img = d.img || '';
    const raw = d.opts.map(function (o) { return o.trim(); });
    const ci = d.correct;
    if (!text && !img) return toast(t('Question {0} needs text or a picture', n + 1), 'error');
    if (!raw[ci]) return toast(t('Question {0}: the correct option is empty', n + 1), 'error');
    const options = raw.filter(Boolean);
    if (options.length < 2) return toast(t('Question {0} needs at least 2 options', n + 1), 'error');
    questions.push({ q: text, image: img, options: options, answer: options.indexOf(raw[ci]) });
  }
  Store.commit(function (st) {
    st.quizzes.unshift({ id: uid(), title: name, lang: qlang.value.trim(), questions: questions, createdAt: Date.now() });
    bump(st);
  });
  makeOpen.value = false;
  toast('Quiz saved');
}

// ----- quiz from flashcards -----
function autoQuiz() {
  const cards = S().cards.filter(function (c) { return c.back; });
  if (cards.length < 4) return toast('Add at least 4 flashcards first', 'error');
  const made = shuffle(cards).slice(0, 10).map(function (c) {
    const others = shuffle(cards.filter(function (x) { return x.id !== c.id && x.back !== c.back; })).slice(0, 3);
    if (!others.length) return null;
    const opts = shuffle([c.back].concat(others.map(function (o) { return o.back; })));
    return { q: c.front || t('What is this picture?'), image: c.image || '', options: opts, answer: opts.indexOf(c.back) };
  }).filter(Boolean);
  if (!made.length) return toast('Your cards need different translations to make a quiz', 'error');
  Store.commit(function (st) {
    st.quizzes.unshift({ id: uid(), title: t('Flashcard quiz {0}', new Date().toLocaleDateString()), lang: t('Mixed'), questions: made, createdAt: Date.now() });
  });
  toast('Quiz created from your flashcards');
}

// ----- play -----
function startPlay(quiz) {
  if (!quiz.questions.length) return;
  play.value = { quiz: quiz, qi: 0, score: 0, picked: null, opts: makeOptions(quiz, 0), done: false };
}
function pick(i) {
  const p = play.value;
  if (p.picked !== null) return;
  p.picked = i;
  if (p.opts[i].ok) p.score++;
}
function next() {
  const p = play.value;
  const total = p.quiz.questions.length;
  if (p.qi + 1 >= total) {
    Store.commit(function (st) {
      st.scores.push({ quizId: p.quiz.id, title: p.quiz.title, score: p.score, total: total, date: Date.now() });
      bump(st);
    });
    p.done = true;
  } else {
    p.qi++; p.picked = null; p.opts = makeOptions(p.quiz, p.qi);
  }
}
function removeQuiz(quiz) {
  if (!window.confirm(t('Delete the quiz "{0}"?', quiz.title))) return;
  Store.commit(function (st) { st.quizzes = st.quizzes.filter(function (q) { return q.id !== quiz.id; }); });
  toast('Quiz deleted');
}
function optClass(p, o, i) {
  if (p.picked === null) return '';
  if (o.ok) return 'correct';
  return i === p.picked ? 'wrong' : '';
}
function pct(p) { return Math.round((p.score / p.quiz.questions.length) * 100); }
function verdict(p) { const v = pct(p); return v >= 80 ? 'Excellent!' : v >= 60 ? 'Good job, keep going!' : 'Keep practicing, you will get there.'; }
</script>

<template>
  <main class="container">
    <div class="page-head">
      <h1>{{ t('Quiz') }}</h1>
      <p class="muted">{{ t('Create your own quizzes, or build one from your flashcards.') }}</p>
    </div>

    <div class="toolbar">
      <button class="btn btn-neon" type="button" @click="openMake">{{ t('+ Add quiz') }}</button>
      <button class="btn btn-ghost" type="button" @click="autoQuiz">{{ t('⚡ Quiz from my flashcards') }}</button>
    </div>

    <div class="grid-cards">
      <div v-if="!S().quizzes.length" class="empty" style="grid-column: 1/-1">
        <h3>{{ t('No quizzes yet') }}</h3>
        <p v-html="t('Press <b>+ Add quiz</b> to write your own, or use <b>Quiz from my flashcards</b>.')"></p>
      </div>
      <div v-for="q in S().quizzes" :key="q.id" class="card quiz-card">
        <h3>{{ q.title }}</h3>
        <div class="quiz-meta">
          <span class="badge">{{ t('{0} questions', q.questions.length) }}</span>
          <span v-if="q.lang" class="badge neon">{{ q.lang }}</span>
          <span v-if="best(q.id) !== null" class="badge" :class="{ red: best(q.id) < 60 }">{{ t('Best {0}%', best(q.id)) }}</span>
        </div>
        <div class="quiz-actions">
          <button class="btn btn-small" type="button" @click="startPlay(q)">{{ t('Play') }}</button>
          <button class="chip danger" type="button" @click="removeQuiz(q)">{{ t('Delete') }}</button>
        </div>
      </div>
    </div>

    <ModalBox :open="makeOpen" title-id="makeTitle" :title="t('New quiz')" wide @close="makeOpen = false">
      <form autocomplete="off" @submit.prevent="saveQuiz">
        <div class="row">
          <div class="field"><label for="qTitle">{{ t('Quiz title') }}</label><input id="qTitle" v-model="title" type="text" :placeholder="t('e.g. Spanish basics')" /></div>
          <div class="field"><label for="qLang">{{ t('Language') }}</label><input id="qLang" v-model="qlang" type="text" :placeholder="t('e.g. Spanish')" /></div>
        </div>
        <p class="muted" style="font-size: 0.9rem">{{ t('For each question, type 2 to 4 options and tick the circle next to the correct one.') }}</p>
        <div>
          <div v-for="(d, n) in qs" :key="d.id" class="qb">
            <div class="qb-head">
              <strong class="qn">{{ t('Question {0}', n + 1) }}</strong>
              <button type="button" class="link-red" @click="removeQ(d.id)">{{ t('Remove') }}</button>
            </div>
            <input v-model="d.text" type="text" class="q-text-in" :placeholder="t(Q_PLACEHOLDER)" />
            <div class="preview">
              <input type="file" accept="image/*" :aria-label="t('Question picture')" @change="onQFile(d, $event)" />
              <img v-if="d.img" :src="d.img" alt="" style="max-height: 70px; border-radius: 10px" />
            </div>
            <label v-for="(o, i) in d.opts" :key="i" class="opt-row">
              <input v-model="d.correct" type="radio" :name="'c' + d.id" :value="i" :aria-label="t('Correct answer {0}', LETTERS[i])" />
              <input v-model="d.opts[i]" type="text" class="opt" :placeholder="t(i < 2 ? 'Option {0}' : 'Option {0} (optional)', LETTERS[i])" />
            </label>
          </div>
        </div>
        <button type="button" class="btn btn-ghost btn-small" @click="qs.push(newQuestion())">{{ t('+ Add question') }}</button>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="makeOpen = false">{{ t('Cancel') }}</button>
          <button type="submit" class="btn">{{ t('Save quiz') }}</button>
        </div>
      </form>
    </ModalBox>

    <ModalBox :open="!!play" title-id="playTitle" :title="play ? play.quiz.title : t('Quiz')" @close="play = null">
      <div v-if="play">
        <div v-if="play.done" class="result">
          <div class="big" :class="{ low: pct(play) < 60 }">{{ pct(play) }}%</div>
          <p>
            <span v-html="t('<b>{0}</b> of {1} correct.', play.score, play.quiz.questions.length)"></span>
            {{ t(verdict(play)) }}
          </p>
          <div class="study-actions">
            <button class="btn" type="button" @click="startPlay(play.quiz)">{{ t('Play again') }}</button>
            <button class="btn btn-ghost" type="button" @click="play = null">{{ t('Close') }}</button>
          </div>
        </div>
        <template v-else>
          <div class="progress"><i :style="{ width: Math.round((play.qi / play.quiz.questions.length) * 100) + '%' }"></i></div>
          <p class="muted">{{ t('Question {0} of {1}', play.qi + 1, play.quiz.questions.length) }}</p>
          <img v-if="imgOK(play.quiz.questions[play.qi].image)" class="q-img" :src="play.quiz.questions[play.qi].image" alt="" />
          <div v-if="play.quiz.questions[play.qi].q" class="q-text">{{ play.quiz.questions[play.qi].q }}</div>
          <button v-for="(o, i) in play.opts" :key="play.qi + '-' + i" type="button" class="opt-btn" :class="optClass(play, o, i)" :disabled="play.picked !== null" @click="pick(i)">{{ o.t }}</button>
          <div class="modal-actions">
            <button v-if="play.picked !== null" class="btn" type="button" @click="next">{{ t(play.qi + 1 === play.quiz.questions.length ? 'See result' : 'Next') }}</button>
          </div>
        </template>
      </div>
    </ModalBox>
  </main>
</template>
