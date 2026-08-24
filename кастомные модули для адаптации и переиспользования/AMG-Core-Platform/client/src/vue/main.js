import { createApp } from 'vue'
import { createPinia } from 'pinia'
import StrigaDashboard from './StrigaDashboard.vue'

// Create Vue app
const app = createApp(StrigaDashboard)

// Use Pinia for state management
app.use(createPinia())

// Mount the app
app.mount('#striga-app')
