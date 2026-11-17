<script setup>
import { onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { t } from '../app';

// A pop-up window. Closes with Esc, with the X, or by tapping the dark area.
const props = defineProps({ open: Boolean, title: String, titleId: String, wide: Boolean });
const emit = defineEmits(['close']);
const box = ref(null);
let timer = null;

function onKey(e) { if (e.key === 'Escape') emit('close'); }
function cleanup() {
  document.body.classList.remove('no-scroll');
  document.removeEventListener('keydown', onKey);
  clearTimeout(timer);
}

watch(function () { return props.open; }, async function (v) {
  if (v) {
    document.body.classList.add('no-scroll');
    document.addEventListener('keydown', onKey);
    await nextTick();
    const f = box.value && box.value.querySelector('input[type=text],input[type=email],textarea');
    if (f) timer = setTimeout(function () { f.focus(); }, 60);
  } else cleanup();
}, { immediate: true });

onBeforeUnmount(cleanup);
function backdrop(e) { if (e.target === e.currentTarget) emit('close'); }
</script>

<template>
  <div v-if="open" class="modal open" role="dialog" aria-modal="true" :aria-labelledby="titleId" @click="backdrop">
    <div class="modal-box" :class="{ wide: wide }" ref="box">
      <div class="modal-head">
        <h2 :id="titleId">{{ title }}</h2>
        <button class="x" type="button" :aria-label="t('Close')" @click="emit('close')">&times;</button>
      </div>
      <slot />
    </div>
  </div>
</template>
