import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

$(() => {
  const app = createApp(App).use(createPinia())
  app.mount('#app')
  $(window).on('pagehide', () => app.unmount())
})
