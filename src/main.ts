import { createApp, reactive } from 'vue'
import App from './App.vue'
import { AppState } from './State';

const state = reactive(new AppState());

createApp(App)
.provide('app-state', state)
.mount('#app')
