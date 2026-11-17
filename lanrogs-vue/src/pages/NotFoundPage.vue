<script setup>
import { t } from '../app';
</script>

<template>
  <main class="container narrow">
    <div class="empty" style="margin-top: 40px">
      <h1>{{ t('Page not found') }}</h1>
      <p>{{ t('That page does not exist or was moved.') }}</p>
      <router-link class="btn" to="/">{{ t('Back to home') }}</router-link>
    </div>
  </main>
</template>
