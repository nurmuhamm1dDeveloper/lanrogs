<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Auth, Cloud } from '../lib/store';
import { t, toast } from '../app';

const router = useRouter();
const stats = ref(null);
const users = ref([]);
const messages = ref([]);
const gate = ref('Checking access...');
const panel = ref(false);
const q = ref('');
let timer = null;

function ago(iso) {
  if (!iso) return t('Never');
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return t('just now');
  if (s < 3600) return t('{0} min ago', Math.round(s / 60));
  if (s < 86400) return t('{0} h ago', Math.round(s / 3600));
  return t('{0} d ago', Math.round(s / 86400));
}
function day(iso) { return iso ? new Date(iso).toLocaleDateString() : '-'; }

async function load() {
  try {
    const r = await Promise.all([
      Cloud.request('rpc/admin_stats', { method: 'POST', body: {} }),
      Cloud.request('rpc/admin_users', { method: 'POST', body: {} }),
      Cloud.request('messages?select=*&order=created_at.desc&limit=200'),
    ]);
    stats.value = r[0]; users.value = r[1] || []; messages.value = r[2] || [];
    panel.value = true;
  } catch (err) {
    if (/not allowed/i.test(err.message)) { router.replace('/'); return; }
    if (!panel.value) gate.value = t('Could not load the dashboard') + ': ' + err.message;
    else toast(err.message, 'error');
  }
}

onMounted(function () {
  if (!Auth.configured()) return;
  load();
  timer = setInterval(function () { if (document.visibilityState === 'visible' && panel.value) load(); }, 30000);
});
onBeforeUnmount(function () { clearInterval(timer); });

async function removeMessage(id) {
  if (!window.confirm(t('Delete this message?'))) return;
  try {
    await Cloud.request('messages?id=eq.' + Number(id), { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    load();
  } catch (err) { toast(err.message, 'error'); }
}

const list = computed(function () {
  const needle = q.value.trim().toLowerCase();
  return users.value.filter(function (u) {
    return !needle || [u.display_name, u.email, u.native, u.learning].join(' ').toLowerCase().indexOf(needle) !== -1;
  });
});
const cells = computed(function () {
  const s = stats.value;
  return s ? [
    [s.total, 'Total users'],
    [s.active_now, 'Active now'],
    [Math.max(0, s.total - s.active_now), 'Not active now'],
    [s.active_today, 'Active today'],
    [s.new_week, 'New this week'],
  ] : [];
});
const configuredNow = Auth.configured();
</script>

<template>
  <main class="container">
    <div class="page-head head-flex">
      <div>
        <h1>{{ t('Admin dashboard') }}</h1>
        <p class="muted">{{ t('Only admins can see this page. "Active" means seen in the last 5 minutes.') }}</p>
      </div>
      <button class="btn btn-ghost btn-small" type="button" @click="load">{{ t('Refresh') }}</button>
    </div>

    <p v-if="!configuredNow" class="muted">{{ t('Admin needs accounts. Set up Supabase first (see README.md).') }}</p>
    <p v-if="configuredNow && !panel" class="muted">{{ t(gate) }}</p>

    <div v-if="panel">
      <div class="stats flat">
        <div v-for="c in cells" :key="c[1]" class="stat"><b>{{ Number(c[0]) }}</b><span>{{ t(c[1]) }}</span></div>
      </div>

      <section class="section-sm">
        <div class="toolbar">
          <h2 style="margin: 0">{{ t('Users') }} <span class="badge">{{ list.length + ' / ' + users.length }}</span></h2>
          <span class="spacer"></span>
          <input v-model="q" type="search" :placeholder="t('Search users...')" :aria-label="t('Search users')" />
        </div>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr><th>{{ t('Status') }}</th><th>{{ t('Name') }}</th><th>{{ t('Email') }}</th><th>{{ t('Native language') }}</th><th>{{ t('Learning') }}</th><th>{{ t('Joined') }}</th><th>{{ t('Last seen') }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="u in list" :key="u.id">
                <td><span class="dot" :class="{ on: u.is_active }"></span>{{ t(u.is_active ? 'Active' : 'Inactive') }}</td>
                <td>{{ u.display_name || '-' }} <span v-if="u.role === 'admin'" class="badge neon">admin</span></td>
                <td>{{ u.email || '-' }}</td>
                <td>{{ u.native || '-' }}</td>
                <td>{{ u.learning || '-' }}</td>
                <td>{{ day(u.created_at) }}</td>
                <td>{{ ago(u.last_seen) }}</td>
              </tr>
              <tr v-if="!list.length"><td colspan="7" class="muted">{{ t('No users found') }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="section-sm">
        <h2>{{ t('Messages') }} <span class="badge">{{ messages.length }}</span></h2>
        <div>
          <div v-for="m in messages" :key="m.id" class="mitem">
            <div class="mhead">
              <span><b>{{ m.name }}</b> &middot; <a :href="'mailto:' + m.email">{{ m.email }}</a></span>
              <span>{{ new Date(m.created_at).toLocaleString() }} <button type="button" class="chip danger" @click="removeMessage(m.id)">{{ t('Delete') }}</button></span>
            </div>
            <div class="mbody">{{ m.message }}</div>
          </div>
          <p v-if="!messages.length" class="muted">{{ t('No messages yet') }}</p>
        </div>
      </section>
    </div>
  </main>
</template>
