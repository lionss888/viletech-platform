<template>
  <div class="tabs-container">
    <!-- Tab headers -->
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="[
            'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
          @click="setActiveTab(tab.id)"
        >
          <span v-if="tab.icon" class="mr-2">{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Tab content -->
    <div class="mt-6">
      <div
        v-for="tab in tabs"
        :key="`content-${tab.id}`"
        v-show="activeTab === tab.id"
        class="tab-content"
      >
        <BDUIComponent
          v-for="component in tab.content"
          :key="component.id"
          :component="component"
          @action="handleAction"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UITab } from '../types/ui'
import BDUIComponent from './BDUIComponent.vue'

interface Props {
  tabs: UITab[]
  defaultTab?: string
}

const props = withDefaults(defineProps<Props>(), {
  defaultTab: undefined,
})

const emit = defineEmits<{
  'tab-change': [tabId: string]
}>()

const activeTab = ref<string>('')

// Set initial active tab
const initializeActiveTab = () => {
  if (props.defaultTab) {
    activeTab.value = props.defaultTab
  } else if (props.tabs.length > 0) {
    activeTab.value = props.tabs[0].id
  }
}

// Initialize on mount
initializeActiveTab()

const setActiveTab = (tabId: string) => {
  activeTab.value = tabId
  emit('tab-change', tabId)
}

const handleAction = (action: string, data: any) => {
  console.log('Tab action:', action, data)
}
</script>

<style scoped>
.tabs-container {
  @apply w-full;
}

.tab-content {
  @apply min-h-[200px];
}
</style>
