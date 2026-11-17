import { createRouter, createWebHistory } from 'vue-router';
import { Auth } from './lib/store';
import { t } from './app';

const DEFAULT_TITLE = 'Lanrogs - Learn languages with flashcards and quizzes';

// title: shown in the tab. noindex: Google should skip it. needsLogin: asks to log in first.
const routes = [
  { path: '/', component: () => import('./pages/HomePage.vue'), meta: { title: '' } },
  { path: '/flashcards', component: () => import('./pages/FlashcardsPage.vue'), meta: { title: 'Flashcards', noindex: true, needsLogin: true } },
  { path: '/quiz', component: () => import('./pages/QuizPage.vue'), meta: { title: 'Quiz', noindex: true, needsLogin: true } },
  { path: '/contact', component: () => import('./pages/ContactPage.vue'), meta: { title: 'Contact' } },
  { path: '/profile', component: () => import('./pages/ProfilePage.vue'), meta: { title: 'Profile', noindex: true, needsLogin: true } },
  { path: '/login', component: () => import('./pages/LoginPage.vue'), meta: { title: 'Log in', noindex: true } },
  { path: '/admin', component: () => import('./pages/AdminPage.vue'), meta: { title: 'Admin', noindex: true, needsLogin: true } },
  { path: '/privacy', component: () => import('./pages/PrivacyPage.vue'), meta: { title: 'Privacy' } },
  { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFoundPage.vue'), meta: { title: 'Page not found', noindex: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes: routes,
  scrollBehavior: function (to, from, saved) { return saved || { top: 0 }; },
});

function loggedOutNeedsLogin(to) {
  return to.meta.needsLogin && Auth.configured() && !Auth.user();
}

router.beforeEach(function (to) {
  if (loggedOutNeedsLogin(to)) return { path: '/login', query: { next: to.path } };
  return true;
});

function setMeta(name, content) {
  let el = document.head.querySelector('meta[name="' + name + '"]');
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

router.afterEach(function (to) {
  document.title = to.meta.title ? t(to.meta.title) + ' - Lanrogs' : DEFAULT_TITLE;
  setMeta('robots', to.meta.noindex ? 'noindex, nofollow' : 'index, follow');
  const link = document.head.querySelector('link[rel="canonical"]');
  if (link && !to.meta.noindex) {
    let origin = '';
    try { origin = new URL(link.getAttribute('href') || '/', window.location.origin).origin; } catch (e) { origin = window.location.origin; }
    link.setAttribute('href', origin + to.path);
  }
});

// logged out while on a private page (e.g. the session ended): go to the login page
window.addEventListener('lanrogs:signedout', function () {
  const cur = router.currentRoute.value;
  if (loggedOutNeedsLogin(cur)) router.replace({ path: '/login', query: { next: cur.path } });
});

export default router;
