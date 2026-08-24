import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UISchema, UIComponent, UIForm, UITab } from '../types/ui'

export const useUIStore = defineStore('ui', () => {
  // State
  const currentSchema = ref<UISchema | null>(null)
  const components = ref<UIComponent[]>([])
  const forms = ref<UIForm[]>([])
  const tabs = ref<UITab[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const userRole = ref('customer')
  const currentPage = ref('dashboard')

  // Getters
  const isInitialized = computed(() => currentSchema.value !== null)
  const hasError = computed(() => error.value !== null)

  // Actions
  const initialize = async () => {
    loading.value = true
    error.value = null

    try {
      // Load UI schema for current role and page
      await loadUISchema(userRole.value, currentPage.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize UI'
      console.error('UI initialization failed:', err)
    } finally {
      loading.value = false
    }
  }

  const loadUISchema = async (role: string, page: string) => {
    try {
      const response = await fetch(`/api/v1/ui/schema/${role}/${page}`)
      if (!response.ok) {
        throw new Error(`Failed to load UI schema: ${response.statusText}`)
      }

      const schema = await response.json()
      currentSchema.value = schema
      components.value = schema.components || []
      forms.value = schema.forms || []
      tabs.value = schema.tabs || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load UI schema'
      throw err
    }
  }

  const loadComponents = async () => {
    try {
      const response = await fetch('/api/v1/ui/components')
      if (!response.ok) {
        throw new Error(`Failed to load components: ${response.statusText}`)
      }

      const data = await response.json()
      components.value = data.components || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load components'
      throw err
    }
  }

  const loadForms = async () => {
    try {
      const response = await fetch('/api/v1/ui/forms')
      if (!response.ok) {
        throw new Error(`Failed to load forms: ${response.statusText}`)
      }

      const data = await response.json()
      forms.value = data.forms || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load forms'
      throw err
    }
  }

  const loadTabs = async () => {
    try {
      const response = await fetch('/api/v1/ui/tabs')
      if (!response.ok) {
        throw new Error(`Failed to load tabs: ${response.statusText}`)
      }

      const data = await response.json()
      tabs.value = data.tabs || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tabs'
      throw err
    }
  }

  const setUserRole = (role: string) => {
    userRole.value = role
    // Reload schema for new role
    if (isInitialized.value) {
      loadUISchema(role, currentPage.value)
    }
  }

  const setCurrentPage = (page: string) => {
    currentPage.value = page
    // Reload schema for new page
    if (isInitialized.value) {
      loadUISchema(userRole.value, page)
    }
  }

  const validateSchema = async (schema: UISchema) => {
    try {
      const response = await fetch('/api/v1/ui/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schema }),
      })

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Schema validation failed'
      throw err
    }
  }

  const getUIStatus = async () => {
    try {
      const response = await fetch('/api/v1/ui/status')
      if (!response.ok) {
        throw new Error(`Failed to get UI status: ${response.statusText}`)
      }

      return await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get UI status'
      throw err
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    // State
    currentSchema,
    components,
    forms,
    tabs,
    loading,
    error,
    userRole,
    currentPage,

    // Getters
    isInitialized,
    hasError,

    // Actions
    initialize,
    loadUISchema,
    loadComponents,
    loadForms,
    loadTabs,
    setUserRole,
    setCurrentPage,
    validateSchema,
    getUIStatus,
    clearError,
  }
})
