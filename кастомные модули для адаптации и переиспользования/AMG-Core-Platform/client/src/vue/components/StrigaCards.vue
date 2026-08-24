<template>
  <div class="striga-cards">
    <div class="cards-header">
      <h2>Cards Management</h2>
      <button @click="showCreateForm = true" class="btn btn-primary">
        + Create Card
      </button>
    </div>

    <!-- Cards Grid -->
    <div class="cards-grid">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading cards...</p>
      </div>
      
      <div v-else-if="cards.length === 0" class="empty-state">
        <p>No cards found</p>
      </div>
      
      <div v-else v-for="card in cards" :key="card.id" class="card-item">
        <div class="card-header">
          <h3>{{ card.type }} Card</h3>
          <span :class="['status-badge', card.status.toLowerCase()]">
            {{ card.status }}
          </span>
        </div>
        
        <div class="card-details">
          <div class="card-number">
            <span class="number-label">Card Number:</span>
            <span class="number-value">{{ formatCardNumber(card.cardNumber) }}</span>
          </div>
          
          <div class="card-expiry">
            <span class="expiry-label">Expires:</span>
            <span class="expiry-value">{{ card.expiryMonth }}/{{ card.expiryYear }}</span>
          </div>
          
          <div class="card-cvv">
            <span class="cvv-label">CVV:</span>
            <span class="cvv-value">{{ card.cvv }}</span>
          </div>
        </div>
        
        <div class="card-info">
          <div class="info-row">
            <span class="info-label">User ID:</span>
            <span class="info-value">{{ card.userId }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Wallet ID:</span>
            <span class="info-value">{{ card.walletId }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Created:</span>
            <span class="info-value">{{ formatDate(card.createdAt) }}</span>
          </div>
        </div>
        
        <div class="card-actions">
          <button 
            v-if="card.status === 'inactive'" 
            @click="activateCard(card.id)" 
            class="btn btn-sm btn-success"
          >
            Activate
          </button>
          <button 
            v-if="card.status === 'active'" 
            @click="deactivateCard(card.id)" 
            class="btn btn-sm btn-warning"
          >
            Deactivate
          </button>
          <button 
            v-if="card.status === 'active'" 
            @click="blockCard(card.id)" 
            class="btn btn-sm btn-danger"
          >
            Block
          </button>
          <button 
            v-if="card.status === 'blocked'" 
            @click="unblockCard(card.id)" 
            class="btn btn-sm btn-success"
          >
            Unblock
          </button>
        </div>
      </div>
    </div>

    <!-- Create Card Modal -->
    <div v-if="showCreateForm" class="modal-overlay" @click="closeCreateForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create New Card</h3>
          <button @click="closeCreateForm" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="createCard" class="modal-form">
          <div class="form-group">
            <label for="userId">User ID *</label>
            <select v-model="newCard.userId" id="userId" required class="form-select" @change="loadUserWallets">
              <option value="">Select User</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="walletId">Wallet ID *</label>
            <select v-model="newCard.walletId" id="walletId" required class="form-select" :disabled="!newCard.userId">
              <option value="">Select Wallet</option>
              <option v-for="wallet in userWallets" :key="wallet.id" :value="wallet.id">
                {{ wallet.currency }} - Balance: {{ wallet.balance }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="cardType">Card Type *</label>
            <select v-model="newCard.type" id="cardType" required class="form-select">
              <option value="">Select Card Type</option>
              <option value="debit">Debit Card</option>
              <option value="credit">Credit Card</option>
              <option value="prepaid">Prepaid Card</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeCreateForm" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="creating" class="btn btn-primary">
              {{ creating ? 'Creating...' : 'Create Card' }}
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
  cards: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['create-card', 'activate-card', 'block-card'])

// Reactive data
const showCreateForm = ref(false)
const creating = ref(false)
const users = ref([])
const userWallets = ref([])

const newCard = reactive({
  userId: '',
  walletId: '',
  type: ''
})

// API base URL
const API_BASE = 'http://localhost:8080/api/v1/striga'

// Methods
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const formatCardNumber = (cardNumber) => {
  if (!cardNumber) return ''
  // Format as XXXX-XXXX-XXXX-XXXX
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
  if (!newCard.userId) {
    userWallets.value = []
    return
  }

  try {
    const response = await axios.get(`${API_BASE}/users/${newCard.userId}/wallets`)
    userWallets.value = response.data.wallets || []
  } catch (error) {
    console.error('Failed to load user wallets:', error)
    userWallets.value = []
  }
}

const createCard = async () => {
  creating.value = true
  try {
    await emit('create-card', { ...newCard })
    closeCreateForm()
    resetNewCard()
  } catch (error) {
    console.error('Failed to create card:', error)
  } finally {
    creating.value = false
  }
}

const activateCard = async (cardId) => {
  try {
    await emit('activate-card', cardId)
  } catch (error) {
    console.error('Failed to activate card:', error)
  }
}

const deactivateCard = async (cardId) => {
  try {
    await emit('deactivate-card', cardId)
  } catch (error) {
    console.error('Failed to deactivate card:', error)
  }
}

const blockCard = async (cardId) => {
  try {
    await emit('block-card', cardId)
  } catch (error) {
    console.error('Failed to block card:', error)
  }
}

const unblockCard = async (cardId) => {
  try {
    await emit('unblock-card', cardId)
  } catch (error) {
    console.error('Failed to unblock card:', error)
  }
}

const closeCreateForm = () => {
  showCreateForm.value = false
  resetNewCard()
}

const resetNewCard = () => {
  Object.assign(newCard, {
    userId: '',
    walletId: '',
    type: ''
  })
  userWallets.value = []
}

// Initialize
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.striga-cards {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.cards-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.cards-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.card-item {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.card-item::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  transform: translate(30px, -30px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.card-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.2);
}

.status-badge.active {
  background: #10b981;
}

.status-badge.inactive {
  background: #6b7280;
}

.status-badge.blocked {
  background: #ef4444;
}

.card-details {
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.card-number {
  margin-bottom: 8px;
}

.number-label,
.expiry-label,
.cvv-label {
  display: block;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-bottom: 2px;
}

.number-value,
.expiry-value,
.cvv-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 1.125rem;
}

.card-info {
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 0.75rem;
  opacity: 0.9;
}

.info-label {
  font-weight: 500;
}

.info-value {
  font-family: monospace;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
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

.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-select:focus {
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
