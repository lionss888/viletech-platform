export interface Model {
  name: string;
  size: number;
  modified_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  convo_id: string;
  stream?: boolean;
  system_prompt_type?: string;
  use_rag?: boolean;
  use_smart_prompts?: boolean;
}

export interface ChatResponse {
  model: string;
  message: ChatMessage;
  conversation_id: string;
  request_id: string;
}

export interface WorkflowRequest {
  name: string;
  params: Record<string, any>;
}

export interface WorkflowResponse {
  name: string;
  status: string;
  result: Record<string, any>;
  request_id: string;
}

export interface MessageResponse {
  id: string;
  created_at: string;
  convo_id: string;
  role: string;
  content: string;
  meta?: Record<string, any>;
}

export interface HistoryResponse {
  messages: MessageResponse[];
  total: number;
  limit: number;
  offset: number;
  conversation_id: string;
}

export interface OllamaHealth {
  ok: boolean;
  host: string;
  latency_ms?: number;
  error?: string;
}
