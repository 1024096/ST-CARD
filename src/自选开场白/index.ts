import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { isTavernRuntime } from './runtime';

$(() => {
  const app = createApp(App).use(createPinia());
  app.provide('isTavernRuntime', isTavernRuntime);
  app.mount('#app');
  $(window).on('pagehide', () => app.unmount());
});