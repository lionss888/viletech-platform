<template>
  <div class="py-6">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">AI Chat</h1>
        <p class="mt-2 text-gray-600">Chat with AI using Backend-Driven UI</p>
      </div>

      <!-- Chat Container -->
      <div class="bg-white shadow rounded-lg h-[600px] flex flex-col">
        <!-- Messages Area -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            v-for="message in messages"
            :key="message.id"
            :class="[
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            ]"
          >
            <div
              :class="[
                'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              ]"
            >
              <p class="text-sm">{{ message.content }}</p>
              <p class="text-xs mt-1 opacity-75">
                {{ formatTime(message.timestamp) }}
              </p>
            </div>
          </div>

          <!-- Loading indicator -->
          <div v-if="loading" class="flex justify-start">
            <div class="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
              <div class="flex items-center space-x-2">
                <div class="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                <span class="text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="border-t p-4">
          <form @submit.prevent="sendMessage" class="flex space-x-2">
            <input
              v-model="inputMessage"
              type="text"
              placeholder="Type your message..."
              class="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :disabled="loading"
            />
            <button
              type="submit"
              :disabled="!inputMessage.trim() || loading"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ChatMessage } from '../types/ui'

const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const loading = ref(false)

onMounted(() => {
  // Add welcome message
  messages.value.push({
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m your AI assistant. How can I help you today?',
    timestamp: new Date().toISOString(),
  })
})

const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) return

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: inputMessage.value,
    timestamp: new Date().toISOString(),
  }

  messages.value.push(userMessage)
  const currentMessage = inputMessage.value
  inputMessage.value = ''
  loading.value = true

  try {
    // Send message to backend
    const response = await fetch('/api/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:3b-instruct-q4_0',
        messages: messages.value,
        use_rag: true,
        use_smart_prompts: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: data.message.content,
      timestamp: new Date().toISOString(),
      metadata: data.metadata,
    }

    messages.value.push(assistantMessage)
  } catch (error) {
    console.error('Error sending message:', error)
    
    const errorMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.',
      timestamp: new Date().toISOString(),
    }

    messages.value.push(errorMessage)
  } finally {
    loading.value = false
  }
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString()
}
</script>
