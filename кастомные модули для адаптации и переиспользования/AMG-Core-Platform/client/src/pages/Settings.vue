<template>
  <div class="py-6">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
        <p class="mt-2 text-gray-600">Configure your application settings</p>
      </div>

      <!-- Settings Content -->
      <div class="space-y-6">
        <!-- Chat Settings -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Chat Settings</h3>
            <p class="mt-1 text-sm text-gray-500">Configure AI chat behavior and preferences</p>
          </div>
          <div class="px-6 py-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Default AI Model</label>
              <select
                v-model="settings.defaultModel"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="llama3.2:3b-instruct-q4_0">Llama 3.2 3B Instruct</option>
                <option value="llama3.2:7b-instruct-q4_0">Llama 3.2 7B Instruct</option>
                <option value="codellama:7b">Code Llama 7B</option>
              </select>
            </div>

            <div class="flex items-center">
              <input
                id="use-rag"
                v-model="settings.useRAG"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="use-rag" class="ml-2 block text-sm text-gray-900">
                Use RAG (Retrieval Augmented Generation)
              </label>
            </div>

            <div class="flex items-center">
              <input
                id="use-smart-prompts"
                v-model="settings.useSmartPrompts"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="use-smart-prompts" class="ml-2 block text-sm text-gray-900">
                Use Smart Prompts
              </label>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Temperature</label>
              <input
                v-model.number="settings.temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                class="mt-1 w-full"
              />
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 (Focused)</span>
                <span>{{ settings.temperature }}</span>
                <span>2 (Creative)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- UI Settings -->
        <div class="bg-white shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">UI Settings</h3>
            <p class="mt-1 text-sm text-gray-500">Customize the user interface</p>
          </div>
          <div class="px-6 py-4 space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Theme</label>
              <select
                v-model="settings.theme"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Language</label>
              <select
                v-model="settings.language"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end">
          <button
            @click="saveSettings"
            :disabled="saving"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const saving = ref(false)

const settings = ref({
  defaultModel: 'llama3.2:3b-instruct-q4_0',
  useRAG: true,
  useSmartPrompts: true,
  temperature: 0.7,
  theme: 'light',
  language: 'en',
})

onMounted(() => {
  loadSettings()
})

const loadSettings = () => {
  // Load settings from localStorage or backend
  const savedSettings = localStorage.getItem('app-settings')
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      settings.value = { ...settings.value, ...parsed }
    } catch (error) {
      console.error('Failed to parse saved settings:', error)
    }
  }
}

const saveSettings = async () => {
  saving.value = true
  
  try {
    // Save to localStorage
    localStorage.setItem('app-settings', JSON.stringify(settings.value))
    
    // Save to backend (if needed)
    // await fetch('/api/v1/settings', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(settings.value),
    // })
    
    console.log('Settings saved successfully')
  } catch (error) {
    console.error('Failed to save settings:', error)
  } finally {
    saving.value = false
  }
}
</script>
