<script setup>
import LogoMark from './LogoMark.vue';
import { t } from '../app';
const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <div class="container foot">
      <router-link class="brand" to="/"><LogoMark :size="32" /><span>Lan<b>rogs</b></span></router-link>
      <span>
        {{ t('Learn languages with your own flashcards and quizzes') }} &middot; &copy; {{ year }} &middot;
        <router-link to="/privacy">{{ t('Privacy') }}</router-link>
      </span>
    </div>
  </footer>
</template>
