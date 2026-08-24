<template>
  <div class="striga-dashboard">
    <div class="dashboard-header">
      <h1>Striga Banking Platform</h1>
      <div class="health-status">
        <span :class="['status-indicator', healthStatus]">
          {{ healthStatus === 'healthy' ? '🟢' : '🔴' }}
        </span>
        <span>{{ healthStatus === 'healthy' ? 'API Available' : 'API Unavailable' }}</span>
      </div>
    </div>

    <div class="dashboard-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>

    <div class="dashboard-content">
      <!-- Users Tab -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <StrigaUsers 
          :users="users" 
          :loading="loading.users"
          @create-user="handleCreateUser"
          @update-user="handleUpdateUser"
          @delete-user="handleDeleteUser"
        />
      </div>

      <!-- Wallets Tab -->
      <div v-if="activeTab === 'wallets'" class="tab-content">
        <StrigaWallets 
          :wallets="wallets" 
          :loading="loading.wallets"
          @create-wallet="handleCreateWallet"
          @update-wallet="handleUpdateWallet"
        />
      </div>

      <!-- Cards Tab -->
      <div v-if="activeTab === 'cards'" class="tab-content">
        <StrigaCards 
          :cards="cards" 
          :loading="loading.cards"
          @create-card="handleCreateCard"
          @activate-card="handleActivateCard"
          @block-card="handleBlockCard"
        />
      </div>

      <!-- Transactions Tab -->
      <div v-if="activeTab === 'transactions'" class="tab-content">
        <StrigaTransactions 
          :transactions="transactions" 
          :loading="loading.transactions"
          @create-transaction="handleCreateTransaction"
          @approve-transaction="handleApproveTransaction"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import axios from 'axios'
import StrigaUsers from './components/StrigaUsers.vue'
import StrigaWallets from './components/StrigaWallets.vue'
import StrigaCards from './components/StrigaCards.vue'
import StrigaTransactions from './components/StrigaTransactions.vue'

// Reactive data
const activeTab = ref('users')
const healthStatus = ref('checking')
const users = ref([])
const wallets = ref([])
const cards = ref([])
const transactions = ref([])

const loading = reactive({
  users: false,
  wallets: false,
  cards: false,
  transactions: false,
  health: false
})

const tabs = [
  { id: 'users', name: 'Users' },
  { id: 'wallets', name: 'Wallets' },
  { id: 'cards', name: 'Cards' },
  { id: 'transactions', name: 'Transactions' }
]

// API base URL
const API_BASE = 'http://localhost:8080/api/v1/striga'

// Health check
const checkHealth = async () => {
  loading.health = true
  try {
    const response = await axios.get(`${API_BASE}/health`)
    healthStatus.value = response.data.status === 'healthy' ? 'healthy' : 'unhealthy'
  } catch (error) {
    healthStatus.value = 'unhealthy'
    console.error('Health check failed:', error)
  } finally {
    loading.health = false
  }
}

// Load data functions
const loadUsers = async () => {
  loading.users = true
  try {
    const response = await axios.get(`${API_BASE}/users`)
    users.value = response.data.users || []
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.users = false
  }
}

const loadWallets = async () => {
  loading.wallets = true
  try {
    // Load wallets for all users or implement user selection
    const response = await axios.get(`${API_BASE}/users`)
    const userList = response.data.users || []
    wallets.value = []
    
    for (const user of userList) {
      try {
        const walletResponse = await axios.get(`${API_BASE}/users/${user.id}/wallets`)
        wallets.value.push(...(walletResponse.data.wallets || []))
      } catch (error) {
        console.error(`Failed to load wallets for user ${user.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to load wallets:', error)
  } finally {
    loading.wallets = false
  }
}

const loadCards = async () => {
  loading.cards = true
  try {
    const response = await axios.get(`${API_BASE}/users`)
    const userList = response.data.users || []
    cards.value = []
    
    for (const user of userList) {
      try {
        const cardResponse = await axios.get(`${API_BASE}/users/${user.id}/cards`)
        cards.value.push(...(cardResponse.data.cards || []))
      } catch (error) {
        console.error(`Failed to load cards for user ${user.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to load cards:', error)
  } finally {
    loading.cards = false
  }
}

const loadTransactions = async () => {
  loading.transactions = true
  try {
    const response = await axios.get(`${API_BASE}/users`)
    const userList = response.data.users || []
    transactions.value = []
    
    for (const user of userList) {
      try {
        const transactionResponse = await axios.get(`${API_BASE}/users/${user.id}/transactions`)
        transactions.value.push(...(transactionResponse.data.transactions || []))
      } catch (error) {
        console.error(`Failed to load transactions for user ${user.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Failed to load transactions:', error)
  } finally {
    loading.transactions = false
  }
}

// Event handlers
const handleCreateUser = async (userData) => {
  try {
    await axios.post(`${API_BASE}/users`, userData)
    await loadUsers()
  } catch (error) {
    console.error('Failed to create user:', error)
    throw error
  }
}

const handleUpdateUser = async (userId, userData) => {
  try {
    await axios.put(`${API_BASE}/users/${userId}`, userData)
    await loadUsers()
  } catch (error) {
    console.error('Failed to update user:', error)
    throw error
  }
}

const handleDeleteUser = async (userId) => {
  try {
    await axios.delete(`${API_BASE}/users/${userId}`)
    await loadUsers()
  } catch (error) {
    console.error('Failed to delete user:', error)
    throw error
  }
}

const handleCreateWallet = async (walletData) => {
  try {
    await axios.post(`${API_BASE}/wallets`, walletData)
    await loadWallets()
  } catch (error) {
    console.error('Failed to create wallet:', error)
    throw error
  }
}

const handleUpdateWallet = async (walletId, walletData) => {
  try {
    await axios.put(`${API_BASE}/wallets/${walletId}`, walletData)
    await loadWallets()
  } catch (error) {
    console.error('Failed to update wallet:', error)
    throw error
  }
}

const handleCreateCard = async (cardData) => {
  try {
    await axios.post(`${API_BASE}/cards`, cardData)
    await loadCards()
  } catch (error) {
    console.error('Failed to create card:', error)
    throw error
  }
}

const handleActivateCard = async (cardId) => {
  try {
    await axios.post(`${API_BASE}/cards/${cardId}/activate`)
    await loadCards()
  } catch (error) {
    console.error('Failed to activate card:', error)
    throw error
  }
}

const handleBlockCard = async (cardId) => {
  try {
    await axios.post(`${API_BASE}/cards/${cardId}/block`)
    await loadCards()
  } catch (error) {
    console.error('Failed to block card:', error)
    throw error
  }
}

const handleCreateTransaction = async (transactionData) => {
  try {
    await axios.post(`${API_BASE}/transactions`, transactionData)
    await loadTransactions()
  } catch (error) {
    console.error('Failed to create transaction:', error)
    throw error
  }
}

const handleApproveTransaction = async (transactionId) => {
  try {
    await axios.post(`${API_BASE}/transactions/${transactionId}/approve`)
    await loadTransactions()
  } catch (error) {
    console.error('Failed to approve transaction:', error)
    throw error
  }
}

// Watch for tab changes
const handleTabChange = async () => {
  switch (activeTab.value) {
    case 'users':
      await loadUsers()
      break
    case 'wallets':
      await loadWallets()
      break
    case 'cards':
      await loadCards()
      break
    case 'transactions':
      await loadTransactions()
      break
  }
}

// Initialize
onMounted(async () => {
  await checkHealth()
  await handleTabChange()
})
</script>

<style scoped>
.striga-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.dashboard-header h1 {
  color: #1f2937;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.health-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-indicator.healthy {
  color: #10b981;
}

.status-indicator.unhealthy {
  color: #ef4444;
}

.dashboard-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 30px;
  border-bottom: 1px solid #e5e7eb;
}

.tab-button {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  transition: all 0.2s;
}

.tab-button:hover {
  color: #374151;
  background: #f9fafb;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-content {
  min-height: 400px;
}
</style>
