// UI Types for Backend-Driven UI

export type UIRole = 
  | 'customer'
  | 'corporate_customer'
  | 'corporate_admin'
  | 'teller'
  | 'credit_officer'
  | 'relationship_manager'
  | 'system_admin'
  | 'security_admin'
  | 'auditor'
  | 'branch_manager'
  | 'cfo'
  | 'ceo'

export type UIComponentType = 
  | 'form'
  | 'table'
  | 'modal'
  | 'card'
  | 'button'
  | 'input'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'date_picker'
  | 'file_upload'
  | 'navigation'
  | 'tabs'
  | 'accordion'
  | 'alert'
  | 'progress'
  | 'spinner'
  | 'container'
  | 'list'
  | 'message'
  | 'charts'

export interface UIValidation {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  options?: string[]
}

export interface UIComponent {
  id: string
  type: UIComponentType
  title?: string
  description?: string
  props: Record<string, any>
  children?: UIComponent[]
  validation?: UIValidation
  permissions?: UIRole[]
  created_at?: string
  updated_at?: string
}

export interface UIAction {
  id: string
  type: string
  label: string
  endpoint?: string
  method?: string
  props?: Record<string, any>
  permissions?: UIRole[]
}

export interface UIForm {
  id: string
  name: string
  title: string
  description: string
  fields: UIComponent[]
  actions: UIAction[]
  permissions?: UIRole[]
  created_at?: string
  updated_at?: string
}

export interface UITab {
  id: string
  name: string
  label: string
  icon?: string
  content: UIComponent[]
  permissions?: UIRole[]
  created_at?: string
  updated_at?: string
}

export interface UISchema {
  id: string
  name: string
  title: string
  description: string
  role: UIRole
  page: string
  components: UIComponent[]
  forms?: UIForm[]
  tabs?: UITab[]
  navigation?: UIComponent
  permissions?: UIRole[]
  created_at?: string
  updated_at?: string
}

export interface UIValidationResponse {
  valid: boolean
  errors?: string[]
  warnings?: string[]
}

export interface UIStatusResponse {
  status: string
  components: number
  forms: number
  tabs: number
  schemas: number
  last_updated: string
}

// Chat specific types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  conversation_id?: string
  use_rag?: boolean
  use_smart_prompts?: boolean
  system_prompt?: string
  stream?: boolean
}

export interface ChatResponse {
  model: string
  message: ChatMessage
  conversation_id: string
  request_id: string
  metadata?: Record<string, any>
}

// Analytics types
export interface AnalyticsData {
  date: string
  users: number
  conversations: number
  messages: number
  avg_response_time: number
}

export interface UserAnalytics {
  user_id: string
  total_conversations: number
  total_messages: number
  avg_session_duration: number
  last_activity: string
}

// Striga types
export interface StrigaUser {
  id: string
  email: string
  phoneNumber: string
  firstName: string
  lastName: string
  dateOfBirth: string
  country: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface StrigaWallet {
  id: string
  userId: string
  currency: string
  balance: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface StrigaCard {
  id: string
  userId: string
  walletId: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  status: string
  type: string
  createdAt: string
  updatedAt: string
}

export interface StrigaTransaction {
  id: string
  userId: string
  walletId: string
  cardId?: string
  amount: string
  currency: string
  type: string
  status: string
  description: string
  merchantName?: string
  createdAt: string
  updatedAt: string
}
