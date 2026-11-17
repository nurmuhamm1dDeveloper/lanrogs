<script setup>
import { ref } from 'vue';
import { imgOK } from '../lib/util';
import { t } from '../app';

// One flashcard that flips when tapped. `hints` shows the "tap to flip" captions.
defineProps({ c: { type: Object, required: true }, hints: { type: Boolean, default: false } });
const flipped = ref(false);
</script>

<template>
  <div class="flip" :class="{ flipped: flipped }" @click="flipped = !flipped">
    <div class="flip-inner">
      <div class="face front">
        <span v-if="c.lang" class="tag">{{ c.lang }}</span>
        <img v-if="imgOK(c.image)" :src="c.image" :alt="t('Flashcard picture')" />
        <div v-if="c.front" class="word">{{ c.front }}</div>
        <span v-if="hints" class="hint">{{ t('tap to flip') }}</span>
      </div>
      <div class="face back">
        <div class="word">{{ c.back }}</div>
        <div v-if="c.note" class="note">{{ c.note }}</div>
        <span v-if="hints" class="hint">{{ t('tap to flip back') }}</span>
      </div>
    </div>
  </div>
</template>
