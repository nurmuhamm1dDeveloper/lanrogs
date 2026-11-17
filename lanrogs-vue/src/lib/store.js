/* Lanrogs data layer (same behaviour as the plain-HTML version).
   - Accounts: Supabase Auth through plain REST calls (no library needed).
   - Each user's flashcards, quizzes and scores are saved in the browser instantly
     and synced to the cloud (table user_data), so they follow the user to every device.
   - The profile (name, picture, design) lives in the cloud table `profiles`.
   If Supabase is not configured, everything works locally in this browser (no accounts).
   Nothing here touches `window` while the page is built on the server: call init() in the browser first. */

const SESSION_KEY = 'lanrogs:session';

// NEXT_PUBLIC_* values must be written out in full like this so Next.js can put them into the page.
export const config = function () {
  return {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    contactEndpoint: import.meta.env.VITE_CONTACT_ENDPOINT || '',
    githubUrl: import.meta.env.VITE_GITHUB_URL || '',
  };
};
const cloudConfigured = function () { const c = config(); return !!(c.supabaseUrl && c.supabaseAnonKey); };
const base = function () { return config().supabaseUrl.replace(/\/+$/, ''); };
function fire(name, detail) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name, { detail: detail }));
}

/* ---------------- session ---------------- */
let session = null;
function readStoredSession() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { /* ignore */ }
  return (s && s.access_token && s.refresh_token && s.user && s.user.id) ? s : null;
}
function saveSession(s) {
  session = s;
  try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}
function toSession(j) {
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_at: j.expires_at || (Math.floor(Date.now() / 1000) + (j.expires_in || 3600)),
    user: { id: j.user.id, email: j.user.email },
  };
}

function authHeaders(token) {
  const k = config().supabaseAnonKey;
  return { apikey: k, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || k) };
}
async function authCall(path, body, method, token) {
  const r = await fetch(base() + '/auth/v1/' + path, { method: method || 'POST', headers: authHeaders(token), body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) { /* ignore */ }
  if (!r.ok) {
    const err = new Error(j.error_description || j.msg || j.message || ('Error ' + r.status));
    err.status = r.status; throw err;
  }
  return j;
}

let refreshing = null;
function refresh() {
  if (!session) return Promise.reject(new Error('Not signed in'));
  if (refreshing) return refreshing;
  // another tab may have refreshed already
  const stored = readStoredSession();
  if (stored && stored.user.id === session.user.id && stored.expires_at - 60 > Date.now() / 1000) { session = stored; return Promise.resolve(); }
  refreshing = authCall('token?grant_type=refresh_token', { refresh_token: session.refresh_token })
    .then(function (j) { saveSession(toSession(j)); })
    .catch(function (e) {
      if (e.status === 400 || e.status === 401 || e.status === 403) { saveSession(null); resetMemory(); fire('lanrogs:signedout'); }
      throw e;
    })
    .then(function () { refreshing = null; }, function (e) { refreshing = null; throw e; });
  return refreshing;
}

// Talks to the database. Signed in: as the user. Not signed in: as an anonymous visitor.
async function request(path, opt) {
  if (!cloudConfigured()) throw new Error('Cloud is not configured');
  opt = opt || {};
  for (let attempt = 0; attempt < 2; attempt++) {
    if (session && session.expires_at - 60 < Date.now() / 1000) await refresh();
    const token = session ? session.access_token : config().supabaseAnonKey;
    const h = Object.assign(authHeaders(token), opt.headers || {});
    const r = await fetch(base() + '/rest/v1/' + path, { method: opt.method || 'GET', headers: h, body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined });
    if (r.status === 401 && session && attempt === 0) { await refresh(); continue; }
    const text = await r.text();
    if (!r.ok) {
      let msg = text; try { const j = JSON.parse(text); msg = j.message || j.hint || text; } catch (e) { /* ignore */ }
      const er = new Error(String(msg).slice(0, 200)); er.status = r.status; throw er;
    }
    return text ? JSON.parse(text) : null;
  }
}

/* ---------------- local data (per user) ---------------- */
function uid() { return session ? session.user.id : 'local'; }
function dataKey(id) { return 'lanrogs:v2:' + (id || uid()); }
function profileKey(id) { return 'lanrogs:profile:' + (id || uid()); }

function blank() { return { updatedAt: 0, cards: [], quizzes: [], scores: [], activity: {} }; }

const IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
function normalize(o) {
  const s = Object.assign(blank(), o || {});
  delete s.profile;
  ['cards', 'quizzes', 'scores'].forEach(function (k) { if (!Array.isArray(s[k])) s[k] = []; });
  if (!s.activity || typeof s.activity !== 'object') s.activity = {};
  // keep only well-formed items, and only pictures in the exact format the site creates itself
  s.cards = s.cards.filter(function (c) { return c && typeof c === 'object'; });
  s.quizzes = s.quizzes.filter(function (q) { return q && typeof q === 'object' && Array.isArray(q.questions); });
  s.scores = s.scores.filter(function (x) { return x && typeof x === 'object'; });
  s.cards.forEach(function (c) { if (typeof c.image !== 'string' || !IMG.test(c.image)) c.image = ''; });
  s.quizzes.forEach(function (q) {
    q.questions = q.questions.filter(function (x) { return x && typeof x === 'object' && Array.isArray(x.options); });
    q.questions.forEach(function (x) { if (typeof x.image !== 'string' || !IMG.test(x.image)) x.image = ''; });
  });
  return s;
}
function blankProfile() {
  return { display_name: '', native: '', learning: '', goal: 10, bio: '', avatar: '', design: {}, role: 'user', email: session ? session.user.email : '' };
}
function normalizeProfile(p) {
  p = Object.assign(blankProfile(), p || {});
  if (!p.design || typeof p.design !== 'object') p.design = {};
  return p;
}

function loadLocal() {
  try { const raw = localStorage.getItem(dataKey()); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* ignore */ }
  return blank();
}
function loadProfileLocal() {
  try {
    const raw = localStorage.getItem(profileKey());
    if (raw) return normalizeProfile(JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return blankProfile();
}

let state = blank();
let profile = blankProfile();
const status = { state: cloudConfigured() ? 'idle' : 'local', msg: '', at: 0 };
let timer = null;
let dirty = false;

function setStatus(st, msg) {
  status.state = st; status.msg = msg || ''; status.at = Date.now();
  fire('lanrogs:status', status);
}
function saveLocal() {
  try { localStorage.setItem(dataKey(), JSON.stringify(state)); return true; }
  catch (e) { fire('lanrogs:error', 'Browser storage is full. Try smaller pictures or turn on cloud sync.'); return false; }
}
function saveProfileLocal() { try { localStorage.setItem(profileKey(), JSON.stringify(profile)); } catch (e) { /* ignore */ } }

// forget the previous person's data in memory (their copy stays in their own browser storage)
function resetMemory() {
  state = blank(); profile = blankProfile(); dirty = false;
  fire('lanrogs:data'); fire('lanrogs:profile');
}

/* ---------------- cloud sync of flashcards, quizzes, scores ---------------- */
function schedulePush() { dirty = true; clearTimeout(timer); timer = setTimeout(push, 1200); }

async function push() {
  if (!cloudConfigured() || !session) return;
  const stamp = state.updatedAt;
  setStatus('syncing');
  try {
    await request('user_data?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { user_id: session.user.id, data: state, updated_at: new Date().toISOString() },
    });
    if (state.updatedAt === stamp) dirty = false;
    setStatus('synced');
  } catch (e) { setStatus('error', e.message); }
}

async function pull(force) {
  if (!cloudConfigured() || !session) return;
  setStatus('syncing');
  try {
    const rows = await request('user_data?user_id=eq.' + session.user.id + '&select=data');
    if (rows && rows.length) {
      const remote = normalize(rows[0].data);
      if (force || remote.updatedAt > state.updatedAt) {
        state = remote; dirty = false;
        saveLocal(); setStatus('synced');
        fire('lanrogs:synced'); fire('lanrogs:data');
        return;
      }
      if (remote.updatedAt < state.updatedAt) { await push(); return; }
      setStatus('synced');
    } else if (state.updatedAt) {
      await push();
    } else {
      setStatus('synced');
    }
  } catch (e) { setStatus('error', e.message); }
}

/* ---------------- profile ---------------- */
const PROFILE_FIELDS = ['display_name', 'native', 'learning', 'goal', 'bio', 'avatar', 'design'];

async function loadProfile() {
  if (!cloudConfigured() || !session) return;
  try {
    const q = 'profiles?id=eq.' + session.user.id + '&select=*';
    let rows = await request(q);
    if (!rows || !rows.length) {
      await request('profiles', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: { id: session.user.id, email: session.user.email, display_name: String(session.user.email || '').split('@')[0].slice(0, 60) },
      });
      rows = await request(q);
    }
    if (rows && rows.length) {
      const before = JSON.stringify(profile);
      profile = normalizeProfile(rows[0]);
      saveProfileLocal();
      if (JSON.stringify(profile) !== before) fire('lanrogs:profile');
    }
  } catch (e) { /* keep the cached profile */ }
}

async function saveProfile(patch) {
  const body = {};
  PROFILE_FIELDS.forEach(function (k) { if (patch && k in patch) body[k] = patch[k]; });
  if (cloudConfigured() && session) {
    await request('profiles?id=eq.' + session.user.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: body });
  }
  profile = normalizeProfile(Object.assign({}, profile, body));
  saveProfileLocal();
  fire('lanrogs:profile');
}

/* ---------------- "who is online" heartbeat ---------------- */
let beatOn = false;
function beat() {
  if (!session || document.visibilityState !== 'visible') return;
  request('rpc/heartbeat', { method: 'POST', body: {} }).catch(function () { /* ignore */ });
}
function startBeat() {
  if (beatOn) return; beatOn = true;
  beat();
  setInterval(beat, 60000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { beat(); pull(); }
  });
}

/* ---------------- start up / sign in ---------------- */
let inited = false;

// after a login (or a login in another tab): load this person's data
function adopt() {
  state = loadLocal(); profile = loadProfileLocal(); dirty = false;
  status.state = cloudConfigured() ? 'idle' : 'local';
  fire('lanrogs:auth'); fire('lanrogs:data'); fire('lanrogs:profile');
  if (cloudConfigured() && session) { loadProfile(); pull(); startBeat(); }
}

// Call once in the browser, before reading anything.
export function init() {
  if (inited || typeof window === 'undefined') return;
  inited = true;
  if (cloudConfigured()) session = readStoredSession();
  state = loadLocal();
  profile = loadProfileLocal();
  status.state = cloudConfigured() ? 'idle' : 'local';
  // another tab logged in/out: follow it
  window.addEventListener('storage', function (e) {
    if (e.key !== SESSION_KEY || !cloudConfigured()) return;
    const prev = session;
    session = readStoredSession();
    if (prev && !session) { resetMemory(); fire('lanrogs:signedout'); }
    else if (session && (!prev || prev.user.id !== session.user.id)) adopt();
  });
  if (cloudConfigured() && session) { loadProfile(); pull(); startBeat(); }
}

/* ---------------- accounts ---------------- */
function wipeLocal(id) {
  if (!id) return;
  try { localStorage.removeItem(dataKey(id)); localStorage.removeItem(profileKey(id)); } catch (e) { /* ignore */ }
}

export const Auth = {
  configured: cloudConfigured,
  user: function () { return session ? session.user : null; },
  signUp: async function (email, password, name) {
    const j = await authCall('signup', { email: email, password: password, data: { display_name: name } });
    if (j.access_token && j.user) { saveSession(toSession(j)); adopt(); return { signedIn: true }; }
    return { signedIn: false }; // the project asks for email confirmation first
  },
  signIn: async function (email, password) {
    const j = await authCall('token?grant_type=password', { email: email, password: password });
    saveSession(toSession(j));
    adopt();
  },
  signOut: async function () {
    const s = session;
    clearTimeout(timer);
    if (s && dirty) await push();
    if (s) { try { await authCall('logout', null, 'POST', s.access_token); } catch (e) { /* ignore */ } }
    if (!dirty) wipeLocal(s && s.user.id); // keep unsynced work for the next login of the same person
    saveSession(null);
    resetMemory();
    fire('lanrogs:auth');
  },
  recover: function (email, redirectTo) {
    return authCall('recover?redirect_to=' + encodeURIComponent(redirectTo || window.location.href), { email: email });
  },
  finishRecovery: async function (p, newPassword) {
    const u = await authCall('user', null, 'GET', p.access_token);
    await authCall('user', { password: newPassword }, 'PUT', p.access_token);
    saveSession({
      access_token: p.access_token, refresh_token: p.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (+p.expires_in || 3600),
      user: { id: u.id, email: u.email },
    });
    adopt();
  },
  deleteAccount: async function () {
    const id = session && session.user.id;
    await request('rpc/delete_my_account', { method: 'POST', body: {} });
    wipeLocal(id); saveSession(null);
    resetMemory();
    fire('lanrogs:auth');
  },
};

export const Cloud = { request: request, configured: cloudConfigured };

export const Store = {
  get: function () { return state; },
  commit: function (fn) { fn(state); state.updatedAt = Date.now(); saveLocal(); schedulePush(); fire('lanrogs:data'); },
  status: function () { return status; },
  cloudConfigured: cloudConfigured,
  push: push,
  pull: pull,
  profile: function () { return profile; },
  saveProfile: saveProfile,
  loadProfile: loadProfile,
  replace: function (obj) { state = normalize(obj); state.updatedAt = Date.now(); saveLocal(); schedulePush(); fire('lanrogs:data'); },
  reset: function () { state = blank(); state.updatedAt = Date.now(); saveLocal(); schedulePush(); fire('lanrogs:data'); },
};
