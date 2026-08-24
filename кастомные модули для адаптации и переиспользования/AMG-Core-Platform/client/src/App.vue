<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-gray-900">AMG Flow</h1>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <router-link
                v-for="route in navigationRoutes"
                :key="route.name"
                :to="route.path"
                :class="[
                  'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                  $route.name === route.name
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                ]"
              >
                {{ route.label }}
              </router-link>
            </div>
          </div>
          
          <!-- User menu -->
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-500">
              Role: {{ userRole }}
            </div>
            <button
              @click="toggleTheme"
              class="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {{ isDark ? '☀️' : '🌙' }}
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main content -->
    <main class="flex-1">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200">
      <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div class="text-center text-sm text-gray-500">
          <p>AMG Flow - Backend-Driven UI Platform</p>
          <p class="mt-1">
            API Base URL: {{ apiBaseUrl }}
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUIStore } from './stores/ui'

const router = useRouter()
const uiStore = useUIStore()

// Theme management
const isDark = ref(false)

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

// User role (will be fetched from backend)
const userRole = ref('customer')

// API configuration
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Navigation routes based on user role
const navigationRoutes = computed(() => {
  const baseRoutes = [
    { name: 'Dashboard', path: '/', label: 'Dashboard' },
    { name: 'Chat', path: '/chat', label: 'Chat' },
  ]

  // Add role-specific routes
  if (['teller', 'credit_officer', 'relationship_manager', 'system_admin'].includes(userRole.value)) {
    baseRoutes.push({ name: 'Striga', path: '/striga', label: 'Striga' })
  }

  if (['system_admin', 'security_admin', 'auditor'].includes(userRole.value)) {
    baseRoutes.push({ name: 'Analytics', path: '/analytics', label: 'Analytics' })
  }

  baseRoutes.push({ name: 'Settings', path: '/settings', label: 'Settings' })

  return baseRoutes
})

onMounted(async () => {
  // Initialize UI store
  await uiStore.initialize()
  
  // Load user role from backend
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`)
    if (response.ok) {
      const user = await response.json()
      userRole.value = user.role || 'customer'
    }
  } catch (error) {
    console.warn('Failed to load user role, using default:', error)
  }
})
</script>

<style>
/* Global styles will be in style.css */
</style>
