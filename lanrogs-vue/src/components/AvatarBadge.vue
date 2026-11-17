<script setup>
import { computed } from 'vue';
import { color, imgOK } from '../lib/util';

const props = defineProps({ p: { type: Object, default: () => ({}) }, size: { type: Number, default: 40 } });

const style = computed(function () {
  const d = (props.p && props.p.design) || {};
  const ring = color(d.accent);
  const st = { width: props.size + 'px', height: props.size + 'px', fontSize: Math.round(props.size * 0.46) + 'px' };
  if (ring) st['--av-ring'] = ring;
  return st;
});
const hasImg = computed(function () { return imgOK(props.p && props.p.avatar); });
const letter = computed(function () {
  const p = props.p || {}, d = p.design || {};
  return String(d.emoji || '').slice(0, 8) || ((p.display_name || 'L').trim().charAt(0).toUpperCase() || 'L');
});
</script>

<template>
  <span class="av" :style="style"><img v-if="hasImg" alt="" :src="p.avatar" /><template v-else>{{ letter }}</template></span>
</template>
