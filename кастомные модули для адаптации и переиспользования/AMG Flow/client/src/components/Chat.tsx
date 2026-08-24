import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '../utils/api';
import { Model, ChatMessage, OllamaHealth } from '../types';

const Chat: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [convoId, setConvoId] = useState<string>(uuidv4());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ollamaHealth, setOllamaHealth] = useState<OllamaHealth | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  // const [abortController] = useState<AbortController | null>(null);
  const [shouldStop, setShouldStop] = useState<boolean>(false);
  const [useRag, setUseRag] = useState<boolean>(false);
  const [useSmartPrompts, setUseSmartPrompts] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadModels();
    checkOllamaHealth();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadModels = async () => {
    try {
      const response = await apiClient.getModels();
      setModels(response.models);
      if (response.models.length > 0) {
        setSelectedModel(response.models[0].name);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const checkOllamaHealth = async () => {
    try {
      const health = await apiClient.getOllamaHealth();
      setOllamaHealth(health);
    } catch (error) {
      console.error('Failed to check Ollama health:', error);
    }
  };

  const stopGeneration = () => {
    setShouldStop(true);
    setIsLoading(false);
    
    // Удаляем последнее сообщение ассистента, если оно пустое
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content === '') {
        newMessages.pop();
      }
      return newMessages;
    });
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedModel || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShouldStop(false);

    try {
      const request = {
        model: selectedModel,
        messages: [...messages, userMessage],
        convo_id: convoId,
        stream: true,
        system_prompt_type: 'default',
        use_rag: useRag,
        use_smart_prompts: useSmartPrompts
      };

      let assistantMessage = '';
      const assistantMessageRef: ChatMessage = {
        role: 'assistant',
        content: ''
      };

      setMessages(prev => [...prev, assistantMessageRef]);

      await apiClient.askChatStream(
        request,
        (chunk) => {
          // Проверяем флаг остановки
          if (shouldStop) {
            return;
          }
          
          if (chunk.message?.content) {
            assistantMessage += chunk.message.content;
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage.role === 'assistant') {
                lastMessage.content = assistantMessage;
              }
              return newMessages;
            });
          }
        },
        (error) => {
          console.error('Stream error:', error);
          setIsLoading(false);
        }
      );

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await apiClient.getHistory(convoId);
      const historyMessages: ChatMessage[] = response.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
      setMessages(historyMessages);
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Chat with Ollama</h1>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm ${
                ollamaHealth?.ok 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {ollamaHealth?.ok ? 'Ollama Online' : 'Ollama Offline'}
                {ollamaHealth?.latency_ms && ` (${ollamaHealth.latency_ms}ms)`}
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} ({Math.round(model.size / 1024 / 1024 / 1024)}GB)
                  </option>
                ))}
              </select>
            </div>
            
            {/* RAG and Smart Prompts Controls */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useRag}
                    onChange={(e) => setUseRag(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    🧠 RAG (Контекст из истории)
                  </span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useSmartPrompts}
                    onChange={(e) => setUseSmartPrompts(e.target.checked)}
                    disabled={!useRag}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    🎯 Умные промпты
                  </span>
                </label>
              </div>
              
              {useRag && (
                <div className="text-xs text-gray-500">
                  {useSmartPrompts 
                    ? "Система будет использовать контекст + умные промпты" 
                    : "Система будет использовать только контекст из истории"
                  }
                </div>
              )}
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conversation ID
              </label>
              <input
                type="text"
                value={convoId}
                onChange={(e) => setConvoId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setConvoId(uuidv4())}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                New Chat
              </button>
            </div>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Conversation History</h3>
              <button
                onClick={loadHistory}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Load History
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Load previous messages for conversation: {convoId}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
            {isLoading ? (
              <button
                onClick={stopGeneration}
                className="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Стоп
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || !selectedModel}
                className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
