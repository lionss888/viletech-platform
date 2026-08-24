<template>
  <form
    :id="form.id"
    :class="formClasses"
    @submit="handleSubmit"
  >
    <div v-if="form.title" class="mb-6">
      <h3 class="text-lg font-medium text-gray-900">{{ form.title }}</h3>
      <p v-if="form.description" class="mt-1 text-sm text-gray-500">{{ form.description }}</p>
    </div>

    <div class="space-y-4">
      <BDUIComponent
        v-for="field in form.fields"
        :key="field.id"
        :component="field"
        v-model="formData[field.id]"
        @action="handleFieldAction"
      />
    </div>

    <div v-if="form.actions.length > 0" class="mt-6 flex justify-end space-x-3">
      <BDUIButton
        v-for="action in form.actions"
        :key="action.id"
        :type="action.type === 'submit' ? 'submit' : 'button'"
        :variant="action.type === 'submit' ? 'primary' : 'secondary'"
        :label="action.label"
        :loading="submitting && action.type === 'submit'"
        @click="handleActionClick(action)"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UIForm } from '../types/ui'
import BDUIComponent from './BDUIComponent.vue'
import BDUIButton from './BDUIButton.vue'

interface Props {
  form: UIForm
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [data: Record<string, any>]
}>()

const formData = ref<Record<string, any>>({})
const submitting = ref(false)

const formClasses = computed(() => {
  return 'bg-white shadow rounded-lg p-6'
})

const handleSubmit = async (event: Event) => {
  event.preventDefault()
  
  if (submitting.value) return
  
  submitting.value = true
  
  try {
    // Validate form data
    const isValid = await validateForm()
    if (!isValid) {
      return
    }
    
    // Emit submit event
    emit('submit', formData.value)
  } finally {
    submitting.value = false
  }
}

const handleFieldAction = (action: string, data: any) => {
  console.log('Field action:', action, data)
}

const handleActionClick = async (action: any) => {
  if (action.type === 'submit') {
    // Form submission is handled by form submit event
    return
  }
  
  // Handle other actions
  console.log('Action clicked:', action)
}

const validateForm = async (): Promise<boolean> => {
  // Basic validation - can be extended
  for (const field of props.form.fields) {
    if (field.validation?.required && !formData.value[field.id]) {
      console.error(`Field ${field.id} is required`)
      return false
    }
  }
  
  return true
}
</script>
