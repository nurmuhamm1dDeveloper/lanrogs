<script setup>
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import { toastState, t } from './app';
</script>

<template>
  <AppHeader />
  <router-view />
  <AppFooter />
  <div class="toast" :class="{ show: toastState.show, error: toastState.type === 'error' }" role="status" aria-live="polite">{{ toastState.msg ? t(toastState.msg) : '' }}</div>
</template>
