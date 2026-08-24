<template>
  <div class="py-6">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Striga Banking Platform</h1>
        <div class="mt-2 flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <span :class="['w-3 h-3 rounded-full', healthStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500']"></span>
            <span class="text-sm text-gray-600">
              {{ healthStatus === 'healthy' ? 'API Available' : 'API Unavailable' }}
            </span>
          </div>
          <button
            @click="checkHealth"
            class="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh Status
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-6">
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
            @click="activeTab = tab.id"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        <!-- Users Tab -->
        <div v-if="activeTab === 'users'" class="space-y-4">
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-900">Users</h2>
            <button
              @click="showCreateUserModal = true"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create User
            </button>
          </div>
          
          <div v-if="loading.users" class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-2 text-gray-600">Loading users...</p>
          </div>
          
          <div v-else-if="users.length === 0" class="text-center py-8 text-gray-500">
            No users found
          </div>
          
          <div v-else class="bg-white shadow overflow-hidden sm:rounded-md">
            <ul class="divide-y divide-gray-200">
              <li v-for="user in users" :key="user.id" class="px-6 py-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-700">
                          {{ user.firstName.charAt(0) }}{{ user.lastName.charAt(0) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ user.firstName }} {{ user.lastName }}
                      </div>
                      <div class="text-sm text-gray-500">{{ user.email }}</div>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span :class="[
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    ]">
                      {{ user.status }}
                    </span>
                    <button
                      @click="editUser(user)"
                      class="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Wallets Tab -->
        <div v-if="activeTab === 'wallets'" class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-900">Wallets</h2>
          <div v-if="loading.wallets" class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-2 text-gray-600">Loading wallets...</p>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            Wallet management coming soon...
          </div>
        </div>

        <!-- Cards Tab -->
        <div v-if="activeTab === 'cards'" class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-900">Cards</h2>
          <div v-if="loading.cards" class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-2 text-gray-600">Loading cards...</p>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            Card management coming soon...
          </div>
        </div>

        <!-- Transactions Tab -->
        <div v-if="activeTab === 'transactions'" class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-900">Transactions</h2>
          <div v-if="loading.transactions" class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-2 text-gray-600">Loading transactions...</p>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            Transaction management coming soon...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { StrigaUser } from '../types/ui'

const activeTab = ref('users')
const healthStatus = ref<'healthy' | 'unhealthy'>('unhealthy')
const loading = ref({
  users: false,
  wallets: false,
  cards: false,
  transactions: false,
})
const users = ref<StrigaUser[]>([])
const showCreateUserModal = ref(false)

const tabs = [
  { id: 'users', name: 'Users' },
  { id: 'wallets', name: 'Wallets' },
  { id: 'cards', name: 'Cards' },
  { id: 'transactions', name: 'Transactions' },
]

onMounted(async () => {
  await checkHealth()
  await loadUsers()
})

const checkHealth = async () => {
  try {
    const response = await fetch('/api/v1/striga/health')
    healthStatus.value = response.ok ? 'healthy' : 'unhealthy'
  } catch (error) {
    healthStatus.value = 'unhealthy'
    console.error('Health check failed:', error)
  }
}

const loadUsers = async () => {
  loading.value.users = true
  try {
    const response = await fetch('/api/v1/striga/users')
    if (response.ok) {
      const data = await response.json()
      users.value = data.users || []
    }
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.value.users = false
  }
}

const editUser = (user: StrigaUser) => {
  console.log('Edit user:', user)
  // Implement user editing
}
</script>
