<template>
  <div class="striga-transactions">
    <div class="transactions-header">
      <h2>Transactions Management</h2>
      <button @click="showCreateForm = true" class="btn btn-primary">
        + Create Transaction
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="filter-group">
        <label for="statusFilter">Status:</label>
        <select v-model="filters.status" id="statusFilter" class="filter-select" @change="applyFilters">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="typeFilter">Type:</label>
        <select v-model="filters.type" id="typeFilter" class="filter-select" @change="applyFilters">
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="transfer">Transfer</option>
          <option value="payment">Payment</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="currencyFilter">Currency:</label>
        <select v-model="filters.currency" id="currencyFilter" class="filter-select" @change="applyFilters">
          <option value="">All Currencies</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="CHF">CHF</option>
        </select>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="transactions-table-container">
      <table class="transactions-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Status</th>
            <th>Description</th>
            <th>User ID</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" class="loading-row">
            <td colspan="8" class="loading-cell">
              <div class="loading-spinner"></div>
              Loading transactions...
            </td>
          </tr>
          <tr v-else-if="filteredTransactions.length === 0" class="empty-row">
            <td colspan="8" class="empty-cell">
              No transactions found
            </td>
          </tr>
          <tr v-else v-for="transaction in filteredTransactions" :key="transaction.id" class="transaction-row">
            <td class="transaction-id">{{ transaction.id }}</td>
            <td class="transaction-amount">
              <span class="amount-value">{{ transaction.amount }}</span>
              <span class="amount-currency">{{ transaction.currency }}</span>
            </td>
            <td class="transaction-type">
              <span :class="['type-badge', transaction.type.toLowerCase()]">
                {{ transaction.type }}
              </span>
            </td>
            <td class="transaction-status">
              <span :class="['status-badge', transaction.status.toLowerCase()]">
                {{ transaction.status }}
              </span>
            </td>
            <td class="transaction-description">{{ transaction.description }}</td>
            <td class="transaction-user">{{ transaction.userId }}</td>
            <td class="transaction-created">{{ formatDate(transaction.createdAt) }}</td>
            <td class="transaction-actions">
              <button 
                v-if="transaction.status === 'pending'" 
                @click="approveTransaction(transaction.id)" 
                class="btn btn-sm btn-success"
              >
                Approve
              </button>
              <button 
                v-if="transaction.status === 'pending'" 
                @click="rejectTransaction(transaction.id)" 
                class="btn btn-sm btn-danger"
              >
                Reject
              </button>
              <button 
                v-if="transaction.status === 'pending'" 
                @click="cancelTransaction(transaction.id)" 
                class="btn btn-sm btn-warning"
              >
                Cancel
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Transaction Modal -->
    <div v-if="showCreateForm" class="modal-overlay" @click="closeCreateForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create New Transaction</h3>
          <button @click="closeCreateForm" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="createTransaction" class="modal-form">
          <div class="form-group">
            <label for="userId">User ID *</label>
            <select v-model="newTransaction.userId" id="userId" required class="form-select" @change="loadUserWallets">
              <option value="">Select User</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="walletId">Wallet ID *</label>
            <select v-model="newTransaction.walletId" id="walletId" required class="form-select" :disabled="!newTransaction.userId">
              <option value="">Select Wallet</option>
              <option v-for="wallet in userWallets" :key="wallet.id" :value="wallet.id">
                {{ wallet.currency }} - Balance: {{ wallet.balance }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="cardId">Card ID (Optional)</label>
            <select v-model="newTransaction.cardId" id="cardId" class="form-select" :disabled="!newTransaction.userId">
              <option value="">No Card</option>
              <option v-for="card in userCards" :key="card.id" :value="card.id">
                {{ card.type }} - {{ formatCardNumber(card.cardNumber) }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="amount">Amount *</label>
              <input 
                v-model="newTransaction.amount" 
                type="number" 
                step="0.01"
                id="amount" 
                required 
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label for="currency">Currency *</label>
              <select v-model="newTransaction.currency" id="currency" required class="form-select">
                <option value="">Select Currency</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="type">Transaction Type *</label>
            <select v-model="newTransaction.type" id="type" required class="form-select">
              <option value="">Select Type</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
              <option value="payment">Payment</option>
            </select>
          </div>
          <div class="form-group">
            <label for="description">Description *</label>
            <textarea 
              v-model="newTransaction.description" 
              id="description" 
              required 
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="merchantName">Merchant Name (Optional)</label>
            <input 
              v-model="newTransaction.merchantName" 
              type="text" 
              id="merchantName" 
              class="form-input"
            >
          </div>
          <div class="form-actions">
            <button type="button" @click="closeCreateForm" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="creating" class="btn btn-primary">
              {{ creating ? 'Creating...' : 'Create Transaction' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import axios from 'axios'

// Props
const props = defineProps({
  transactions: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['create-transaction', 'approve-transaction'])

// Reactive data
const showCreateForm = ref(false)
const creating = ref(false)
const users = ref([])
const userWallets = ref([])
const userCards = ref([])

const filters = reactive({
  status: '',
  type: '',
  currency: ''
})

const newTransaction = reactive({
  userId: '',
  walletId: '',
  cardId: '',
  amount: '',
  currency: '',
  type: '',
  description: '',
  merchantName: ''
})

// API base URL
const API_BASE = 'http://localhost:8080/api/v1/striga'

// Computed
const filteredTransactions = computed(() => {
  let filtered = [...props.transactions]
  
  if (filters.status) {
    filtered = filtered.filter(t => t.status.toLowerCase() === filters.status.toLowerCase())
  }
  
  if (filters.type) {
    filtered = filtered.filter(t => t.type.toLowerCase() === filters.type.toLowerCase())
  }
  
  if (filters.currency) {
    filtered = filtered.filter(t => t.currency === filters.currency)
  }
  
  return filtered
})

// Methods
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const formatCardNumber = (cardNumber) => {
  if (!cardNumber) return ''
  return cardNumber.replace(/(\d{4})(?=\d)/g, '$1-')
}

const loadUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE}/users`)
    users.value = response.data.users || []
  } catch (error) {
    console.error('Failed to load users:', error)
  }
}

const loadUserWallets = async () => {
  if (!newTransaction.userId) {
    userWallets.value = []
    userCards.value = []
    return
  }

  try {
    const [walletsResponse, cardsResponse] = await Promise.all([
      axios.get(`${API_BASE}/users/${newTransaction.userId}/wallets`),
      axios.get(`${API_BASE}/users/${newTransaction.userId}/cards`)
    ])
    
    userWallets.value = walletsResponse.data.wallets || []
    userCards.value = cardsResponse.data.cards || []
  } catch (error) {
    console.error('Failed to load user data:', error)
    userWallets.value = []
    userCards.value = []
  }
}

const createTransaction = async () => {
  creating.value = true
  try {
    const transactionData = { ...newTransaction }
    if (!transactionData.cardId) {
      delete transactionData.cardId
    }
    if (!transactionData.merchantName) {
      delete transactionData.merchantName
    }
    
    await emit('create-transaction', transactionData)
    closeCreateForm()
    resetNewTransaction()
  } catch (error) {
    console.error('Failed to create transaction:', error)
  } finally {
    creating.value = false
  }
}

const approveTransaction = async (transactionId) => {
  try {
    await emit('approve-transaction', transactionId)
  } catch (error) {
    console.error('Failed to approve transaction:', error)
  }
}

const rejectTransaction = async (transactionId) => {
  if (confirm('Are you sure you want to reject this transaction?')) {
    try {
      // Implement reject logic
      console.log('Rejecting transaction:', transactionId)
    } catch (error) {
      console.error('Failed to reject transaction:', error)
    }
  }
}

const cancelTransaction = async (transactionId) => {
  if (confirm('Are you sure you want to cancel this transaction?')) {
    try {
      // Implement cancel logic
      console.log('Cancelling transaction:', transactionId)
    } catch (error) {
      console.error('Failed to cancel transaction:', error)
    }
  }
}

const applyFilters = () => {
  // Filters are applied automatically through computed property
}

const closeCreateForm = () => {
  showCreateForm.value = false
  resetNewTransaction()
}

const resetNewTransaction = () => {
  Object.assign(newTransaction, {
    userId: '',
    walletId: '',
    cardId: '',
    amount: '',
    currency: '',
    type: '',
    description: '',
    merchantName: ''
  })
  userWallets.value = []
  userCards.value = []
}

// Initialize
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.striga-transactions {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.transactions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.transactions-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.filters-section {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.filter-select {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  background: white;
}

.transactions-table-container {
  overflow-x: auto;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.transactions-table th,
.transactions-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.transactions-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.transaction-id {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
}

.transaction-amount {
  font-weight: 600;
}

.amount-value {
  color: #1f2937;
}

.amount-currency {
  color: #6b7280;
  font-size: 0.875rem;
  margin-left: 4px;
}

.type-badge,
.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.type-badge.deposit {
  background: #dcfce7;
  color: #166534;
}

.type-badge.withdrawal {
  background: #fee2e2;
  color: #991b1b;
}

.type-badge.transfer {
  background: #dbeafe;
  color: #1e40af;
}

.type-badge.payment {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.approved {
  background: #dcfce7;
  color: #166534;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.cancelled {
  background: #f3f4f6;
  color: #374151;
}

.transaction-description {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-actions {
  display: flex;
  gap: 4px;
}

.loading-cell,
.empty-cell {
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
  max-width: 600px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-select:disabled {
  background: #f3f4f6;
  color: #9ca3af;
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

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 0.75rem;
}
</style>
