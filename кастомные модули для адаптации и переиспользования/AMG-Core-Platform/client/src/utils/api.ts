import axios from 'axios';
import { Model, ChatRequest, ChatResponse, WorkflowRequest, WorkflowResponse, HistoryResponse, OllamaHealth } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add request ID
api.interceptors.request.use((config) => {
  if (!config.headers['X-Request-ID']) {
    config.headers['X-Request-ID'] = crypto.randomUUID();
  }
  return config;
});

export const apiClient = {
  // Health checks
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/health');
    return response.data;
  },

  async getOllamaHealth(): Promise<OllamaHealth> {
    const response = await api.get('/v1/health/ollama');
    return response.data;
  },

  // Models
  async getModels(): Promise<{ models: Model[] }> {
    const response = await api.get('/v1/ai/models');
    return response.data;
  },

  // Chat
  async askChat(request: ChatRequest): Promise<ChatResponse> {
    const response = await api.post('/v1/ai/chat', request);
    return response.data;
  },

  async askChatStream(
    request: ChatRequest,
    onChunk: (chunk: any) => void,
    onError?: (error: Error) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      // Создаем таймаут на 30 секунд
      const timeoutId = setTimeout(() => {
        if (signal && !signal.aborted) {
          console.log('Request timeout, aborting...');
          // Создаем новый AbortController для таймаута
          const timeoutController = new AbortController();
          timeoutController.abort();
        }
      }, 30000);

      const response = await fetch(`${API_BASE_URL}/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID(),
        },
        body: JSON.stringify(request),
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
            } catch (e) {
              console.warn('Failed to parse chunk:', line);
            }
          }
        }
      }
    } catch (error) {
      if (signal?.aborted) {
        console.log('Request aborted by user');
        return;
      }
      onError?.(error as Error);
    }
  },

  // Workflow
  async runWorkflow(request: WorkflowRequest): Promise<WorkflowResponse> {
    const response = await api.post('/v1/run_workflow', request);
    return response.data;
  },

  // History
  async getHistory(convo_id: string, limit = 50, offset = 0): Promise<HistoryResponse> {
    const response = await api.get('/v1/history', {
      params: { convo_id, limit, offset }
    });
    return response.data;
  },
};
