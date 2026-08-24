<template>
  <div class="striga-wallets">
    <div class="wallets-header">
      <h2>Wallets Management</h2>
      <button @click="showCreateForm = true" class="btn btn-primary">
        + Create Wallet
      </button>
    </div>

    <!-- Wallets Grid -->
    <div class="wallets-grid">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading wallets...</p>
      </div>
      
      <div v-else-if="wallets.length === 0" class="empty-state">
        <p>No wallets found</p>
      </div>
      
      <div v-else v-for="wallet in wallets" :key="wallet.id" class="wallet-card">
        <div class="wallet-header">
          <h3>{{ wallet.currency }} Wallet</h3>
          <span :class="['status-badge', wallet.status.toLowerCase()]">
            {{ wallet.status }}
          </span>
        </div>
        
        <div class="wallet-balance">
          <span class="balance-amount">{{ wallet.balance }}</span>
          <span class="balance-currency">{{ wallet.currency }}</span>
        </div>
        
        <div class="wallet-info">
          <div class="info-row">
            <span class="info-label">User ID:</span>
            <span class="info-value">{{ wallet.userId }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Created:</span>
            <span class="info-value">{{ formatDate(wallet.createdAt) }}</span>
          </div>
        </div>
        
        <div class="wallet-actions">
          <button @click="updateWalletBalance(wallet)" class="btn btn-sm btn-secondary">
            Update Balance
          </button>
          <button @click="toggleWalletStatus(wallet)" class="btn btn-sm" :class="wallet.status === 'active' ? 'btn-warning' : 'btn-success'">
            {{ wallet.status === 'active' ? 'Freeze' : 'Unfreeze' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Create Wallet Modal -->
    <div v-if="showCreateForm" class="modal-overlay" @click="closeCreateForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create New Wallet</h3>
          <button @click="closeCreateForm" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="createWallet" class="modal-form">
          <div class="form-group">
            <label for="userId">User ID *</label>
            <select v-model="newWallet.userId" id="userId" required class="form-select">
              <option value="">Select User</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="currency">Currency *</label>
            <select v-model="newWallet.currency" id="currency" required class="form-select">
              <option value="">Select Currency</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CHF">CHF - Swiss Franc</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeCreateForm" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="creating" class="btn btn-primary">
              {{ creating ? 'Creating...' : 'Create Wallet' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Update Balance Modal -->
    <div v-if="showBalanceForm" class="modal-overlay" @click="closeBalanceForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Update Wallet Balance</h3>
          <button @click="closeBalanceForm" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="updateBalance" class="modal-form">
          <div class="form-group">
            <label>Wallet: {{ selectedWallet?.currency }} ({{ selectedWallet?.userId }})</label>
          </div>
          <div class="form-group">
            <label for="balance">New Balance *</label>
            <input 
              v-model="balanceUpdate.amount" 
              type="number" 
              step="0.01"
              id="balance" 
              required 
              class="form-input"
            >
          </div>
          <div class="form-actions">
            <button type="button" @click="closeBalanceForm" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="updating" class="btn btn-primary">
              {{ updating ? 'Updating...' : 'Update Balance' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'

// Props
const props = defineProps({
  wallets: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['create-wallet', 'update-wallet'])

// Reactive data
const showCreateForm = ref(false)
const showBalanceForm = ref(false)
const creating = ref(false)
const updating = ref(false)
const users = ref([])
const selectedWallet = ref(null)

const newWallet = reactive({
  userId: '',
  currency: ''
})

const balanceUpdate = reactive({
  amount: ''
})

// API base URL
const API_BASE = 'http://localhost:8080/api/v1/striga'

// Methods
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const loadUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE}/users`)
    users.value = response.data.users || []
  } catch (error) {
    console.error('Failed to load users:', error)
  }
}

const createWallet = async () => {
  creating.value = true
  try {
    await emit('create-wallet', { ...newWallet })
    closeCreateForm()
    resetNewWallet()
  } catch (error) {
    console.error('Failed to create wallet:', error)
  } finally {
    creating.value = false
  }
}

const updateWalletBalance = (wallet) => {
  selectedWallet.value = wallet
  balanceUpdate.amount = wallet.balance
  showBalanceForm.value = true
}

const updateBalance = async () => {
  updating.value = true
  try {
    await emit('update-wallet', selectedWallet.value.id, { amount: balanceUpdate.amount })
    closeBalanceForm()
  } catch (error) {
    console.error('Failed to update wallet balance:', error)
  } finally {
    updating.value = false
  }
}

const toggleWalletStatus = async (wallet) => {
  try {
    if (wallet.status === 'active') {
      await emit('update-wallet', wallet.id, { action: 'freeze' })
    } else {
      await emit('update-wallet', wallet.id, { action: 'unfreeze' })
    }
  } catch (error) {
    console.error('Failed to toggle wallet status:', error)
  }
}

const closeCreateForm = () => {
  showCreateForm.value = false
  resetNewWallet()
}

const closeBalanceForm = () => {
  showBalanceForm.value = false
  selectedWallet.value = null
  balanceUpdate.amount = ''
}

const resetNewWallet = () => {
  Object.assign(newWallet, {
    userId: '',
    currency: ''
  })
}

// Initialize
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.striga-wallets {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.wallets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.wallets-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.wallets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.wallet-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s;
}

.wallet-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.wallet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.wallet-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.125rem;
  font-weight: 600;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

.status-badge.frozen {
  background: #fee2e2;
  color: #991b1b;
}

.wallet-balance {
  text-align: center;
  margin-bottom: 20px;
  padding: 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.balance-amount {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.balance-currency {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.wallet-info {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.info-label {
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  color: #1f2937;
  font-family: monospace;
}

.wallet-actions {
  display: flex;
  gap: 8px;
}

.loading-state,
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d97706;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 0.75rem;
}
</style>
