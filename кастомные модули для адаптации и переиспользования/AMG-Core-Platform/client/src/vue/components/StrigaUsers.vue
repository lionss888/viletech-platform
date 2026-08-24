<template>
  <div class="striga-users">
    <div class="users-header">
      <h2>Users Management</h2>
      <button @click="showCreateForm = true" class="btn btn-primary">
        + Create User
      </button>
    </div>

    <!-- Users Table -->
    <div class="users-table-container">
      <table class="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Country</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" class="loading-row">
            <td colspan="8" class="loading-cell">
              <div class="loading-spinner"></div>
              Loading users...
            </td>
          </tr>
          <tr v-else-if="users.length === 0" class="empty-row">
            <td colspan="8" class="empty-cell">
              No users found
            </td>
          </tr>
          <tr v-else v-for="user in users" :key="user.id" class="user-row">
            <td class="user-id">{{ user.id }}</td>
            <td class="user-email">{{ user.email }}</td>
            <td class="user-name">{{ user.firstName }} {{ user.lastName }}</td>
            <td class="user-phone">{{ user.phoneNumber }}</td>
            <td class="user-country">{{ user.country }}</td>
            <td class="user-status">
              <span :class="['status-badge', user.status.toLowerCase()]">
                {{ user.status }}
              </span>
            </td>
            <td class="user-created">{{ formatDate(user.createdAt) }}</td>
            <td class="user-actions">
              <button @click="editUser(user)" class="btn btn-sm btn-secondary">
                Edit
              </button>
              <button @click="deleteUser(user.id)" class="btn btn-sm btn-danger">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateForm" class="modal-overlay" @click="closeCreateForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create New User</h3>
          <button @click="closeCreateForm" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="createUser" class="modal-form">
          <div class="form-group">
            <label for="email">Email *</label>
            <input 
              v-model="newUser.email" 
              type="email" 
              id="email" 
              required 
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label for="phoneNumber">Phone Number *</label>
            <input 
              v-model="newUser.phoneNumber" 
              type="tel" 
              id="phoneNumber" 
              required 
              class="form-input"
            >
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">First Name *</label>
              <input 
                v-model="newUser.firstName" 
                type="text" 
                id="firstName" 
                required 
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label for="lastName">Last Name *</label>
              <input 
                v-model="newUser.lastName" 
                type="text" 
                id="lastName" 
                required 
                class="form-input"
              >
            </div>
          </div>
          <div class="form-group">
            <label for="dateOfBirth">Date of Birth *</label>
            <input 
              v-model="newUser.dateOfBirth" 
              type="date" 
              id="dateOfBirth" 
              required 
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label for="country">Country *</label>
            <select v-model="newUser.country" id="country" required class="form-select">
              <option value="">Select Country</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="IT">Italy</option>
              <option value="ES">Spain</option>
              <option value="NL">Netherlands</option>
              <option value="BE">Belgium</option>
              <option value="AT">Austria</option>
              <option value="CH">Switzerland</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeCreateForm" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="creating" class="btn btn-primary">
              {{ creating ? 'Creating...' : 'Create User' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditForm" class="modal-overlay" @click="closeEditForm">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Edit User</h3>
          <button @click="closeEditForm" class="modal-close">&times;</button>
        </div>
        <form @submit.prevent="updateUser" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label for="editFirstName">First Name</label>
              <input 
                v-model="editUser.firstName" 
                type="text" 
                id="editFirstName" 
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label for="editLastName">Last Name</label>
              <input 
                v-model="editUser.lastName" 
                type="text" 
                id="editLastName" 
                class="form-input"
              >
            </div>
          </div>
          <div class="form-group">
            <label for="editDateOfBirth">Date of Birth</label>
            <input 
              v-model="editUser.dateOfBirth" 
              type="date" 
              id="editDateOfBirth" 
              class="form-input"
            >
          </div>
          <div class="form-group">
            <label for="editCountry">Country</label>
            <select v-model="editUser.country" id="editCountry" class="form-select">
              <option value="">Select Country</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="IT">Italy</option>
              <option value="ES">Spain</option>
              <option value="NL">Netherlands</option>
              <option value="BE">Belgium</option>
              <option value="AT">Austria</option>
              <option value="CH">Switzerland</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeEditForm" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" :disabled="updating" class="btn btn-primary">
              {{ updating ? 'Updating...' : 'Update User' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

// Props
const props = defineProps({
  users: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['create-user', 'update-user', 'delete-user'])

// Reactive data
const showCreateForm = ref(false)
const showEditForm = ref(false)
const creating = ref(false)
const updating = ref(false)

const newUser = reactive({
  email: '',
  phoneNumber: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  country: ''
})

const editUser = reactive({
  id: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  country: ''
})

// Methods
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const createUser = async () => {
  creating.value = true
  try {
    await emit('create-user', { ...newUser })
    closeCreateForm()
    resetNewUser()
  } catch (error) {
    console.error('Failed to create user:', error)
  } finally {
    creating.value = false
  }
}

const updateUser = async () => {
  updating.value = true
  try {
    await emit('update-user', editUser.id, { ...editUser })
    closeEditForm()
  } catch (error) {
    console.error('Failed to update user:', error)
  } finally {
    updating.value = false
  }
}

const deleteUser = async (userId) => {
  if (confirm('Are you sure you want to delete this user?')) {
    try {
      await emit('delete-user', userId)
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }
}

const editUserData = (user) => {
  editUser.id = user.id
  editUser.firstName = user.firstName
  editUser.lastName = user.lastName
  editUser.dateOfBirth = user.dateOfBirth
  editUser.country = user.country
}

const closeCreateForm = () => {
  showCreateForm.value = false
  resetNewUser()
}

const closeEditForm = () => {
  showEditForm.value = false
}

const resetNewUser = () => {
  Object.assign(newUser, {
    email: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    country: ''
  })
}
</script>

<style scoped>
.striga-users {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.users-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.users-table-container {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.users-table th,
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.users-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-id {
  font-family: monospace;
  font-size: 0.75rem;
  color: #6b7280;
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

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.suspended {
  background: #fee2e2;
  color: #991b1b;
}

.user-actions {
  display: flex;
  gap: 8px;
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
