import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { boot } from './app';
import './style.css';

boot();
createApp(App).use(router).mount('#app');
