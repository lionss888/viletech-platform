import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// Import pages
import Dashboard from './pages/Dashboard.vue'
import Chat from './pages/Chat.vue'
import Analytics from './pages/Analytics.vue'
import Settings from './pages/Settings.vue'
import StrigaDashboard from './pages/StrigaDashboard.vue'

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/chat', name: 'Chat', component: Chat },
    { path: '/analytics', name: 'Analytics', component: Analytics },
    { path: '/settings', name: 'Settings', component: Settings },
    { path: '/striga', name: 'Striga', component: StrigaDashboard },
  ],
})

// Create Pinia store
const pinia = createPinia()

// Create Vue app
const app = createApp(App)

// Use plugins
app.use(pinia)
app.use(router)

// Mount the app
app.mount('#app')
