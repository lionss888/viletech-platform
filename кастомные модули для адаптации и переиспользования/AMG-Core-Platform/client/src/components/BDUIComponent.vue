<template>
  <component
    :is="componentName"
    v-bind="componentProps"
    @click="handleClick"
    @input="handleInput"
    @change="handleChange"
  >
    <!-- Render children recursively -->
    <BDUIComponent
      v-for="child in component.children"
      :key="child.id"
      :component="child"
      :data="data"
      @action="handleAction"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { UIComponent } from '../types/ui'

// Props
interface Props {
  component: UIComponent
  data?: Record<string, any>
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  action: [action: string, data: any]
}>()

// Component mapping
const componentMap: Record<string, string> = {
  form: 'BDUIForm',
  table: 'BDUITable',
  modal: 'BDUIModal',
  card: 'BDUICard',
  button: 'BDUIButton',
  input: 'BDUIInput',
  select: 'BDUISelect',
  textarea: 'BDUITextarea',
  checkbox: 'BDUICheckbox',
  radio: 'BDUIRadio',
  date_picker: 'BDUIDatePicker',
  file_upload: 'BDUIFileUpload',
  navigation: 'BDUINavigation',
  tabs: 'BDUITabs',
  accordion: 'BDUIAccordion',
  alert: 'BDUIAlert',
  progress: 'BDUIProgress',
  spinner: 'BDUISpinner',
  container: 'BDUIContainer',
  list: 'BDUIList',
  message: 'BDUIMessage',
  charts: 'BDUICharts',
}

// Computed
const componentName = computed(() => {
  return componentMap[props.component.type] || 'div'
})

const componentProps = computed(() => {
  const baseProps = { ...props.component.props }
  
  // Add data binding
  if (props.data) {
    Object.assign(baseProps, props.data)
  }
  
  return baseProps
})

// Event handlers
const handleClick = (event: Event) => {
  if (props.component.props?.onClick) {
    emit('action', 'click', { event, component: props.component })
  }
}

const handleInput = (event: Event) => {
  if (props.component.props?.onInput) {
    emit('action', 'input', { event, component: props.component })
  }
}

const handleChange = (event: Event) => {
  if (props.component.props?.onChange) {
    emit('action', 'change', { event, component: props.component })
  }
}

const handleAction = (action: string, data: any) => {
  emit('action', action, data)
}
</script>
