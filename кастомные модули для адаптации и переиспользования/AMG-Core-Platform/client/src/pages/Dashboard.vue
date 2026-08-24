<template>
  <div class="py-6">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p class="mt-2 text-gray-600">Welcome to AMG Flow Backend-Driven UI</p>
      </div>

      <!-- Loading state -->
      <div v-if="uiStore.loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600">Loading UI components...</span>
      </div>

      <!-- Error state -->
      <div v-else-if="uiStore.hasError" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error loading UI</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>{{ uiStore.error }}</p>
            </div>
            <div class="mt-4">
              <button
                @click="uiStore.initialize()"
                class="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic UI Components -->
      <div v-else-if="uiStore.currentSchema" class="space-y-6">
        <!-- Render components from backend -->
        <BDUIComponent
          v-for="component in uiStore.components"
          :key="component.id"
          :component="component"
          @action="handleAction"
        />

        <!-- Render forms if available -->
        <div v-if="uiStore.forms.length > 0" class="space-y-6">
          <h2 class="text-xl font-semibold text-gray-900">Forms</h2>
          <BDUIForm
            v-for="form in uiStore.forms"
            :key="form.id"
            :form="form"
            @submit="handleFormSubmit"
          />
        </div>

        <!-- Render tabs if available -->
        <div v-if="uiStore.tabs.length > 0" class="space-y-6">
          <h2 class="text-xl font-semibold text-gray-900">Navigation</h2>
          <BDUITabs
            :tabs="uiStore.tabs"
            @tab-change="handleTabChange"
          />
        </div>
      </div>

      <!-- Fallback content -->
      <div v-else class="text-center py-12">
        <div class="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No UI schema loaded</h3>
        <p class="mt-1 text-sm text-gray-500">The backend hasn't provided any UI components for this page.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useUIStore } from '../stores/ui'
import BDUIComponent from '../components/BDUIComponent.vue'
import BDUIForm from '../components/BDUIForm.vue'
import BDUITabs from '../components/BDUITabs.vue'

const uiStore = useUIStore()

onMounted(async () => {
  if (!uiStore.isInitialized) {
    await uiStore.initialize()
  }
})

const handleAction = (action: string, data: any) => {
  console.log('Action triggered:', action, data)
  // Handle different actions based on type
  switch (action) {
    case 'navigate':
      // Handle navigation
      break
    case 'submit':
      // Handle form submission
      break
    case 'click':
      // Handle button clicks
      break
    default:
      console.log('Unknown action:', action)
  }
}

const handleFormSubmit = (formData: any) => {
  console.log('Form submitted:', formData)
  // Handle form submission
}

const handleTabChange = (tabId: string) => {
  console.log('Tab changed to:', tabId)
  // Handle tab change
}
</script>
