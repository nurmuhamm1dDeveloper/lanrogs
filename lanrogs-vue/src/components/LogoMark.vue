<script>
let counter = 0;
</script>
<script setup>
defineProps({ size: { type: Number, default: 40 } });
const id = 'lg' + (++counter);
</script>

<template>
  <svg class="logo-mark" :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient :id="id" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#19e3ff" />
        <stop offset=".45" stop-color="#0fa968" />
        <stop offset="1" stop-color="#0a6b46" />
      </linearGradient>
    </defs>
    <path d="M12 6h40a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H34L20 60V48h-8a8 8 0 0 1-8-8V14a8 8 0 0 1 8-8z" :fill="'url(#' + id + ')'" />
    <path d="M22 16v22h18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="45" cy="19" r="4.5" fill="#ff3b4e" />
  </svg>
</template>
