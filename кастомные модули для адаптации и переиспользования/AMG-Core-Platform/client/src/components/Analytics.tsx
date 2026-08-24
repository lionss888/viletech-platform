import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '../utils/api';
import { Model, ChatMessage, OllamaHealth } from '../types';

const Analytics: React.FC = () => {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Предустановленные запросы для аналитики
  const analyticsPrompts = [
    {
      title: "Анализ данных",
      prompt: "Проанализируй данные и создай подробный отчет с выводами и рекомендациями. Обрати внимание на тренды, аномалии и ключевые метрики."
    },
    {
      title: "Статистический анализ",
      prompt: "Проведи статистический анализ данных. Рассчитай основные статистические показатели, проверь гипотезы и создай визуализацию результатов."
    },
    {
      title: "Прогнозирование",
      prompt: "Создай прогноз на основе исторических данных. Используй подходящие методы прогнозирования и оцени точность модели."
    },
    {
      title: "A/B тестирование",
      prompt: "Спланируй и проведи A/B тест. Определи метрики, размер выборки, длительность эксперимента и методы анализа результатов."
    },
    {
      title: "Корреляционный анализ",
      prompt: "Найди корреляции между переменными в данных. Определи силу и направление связей, проверь статистическую значимость."
    }
  ];

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

  const sendMessage = async (messageText?: string) => {
    const message = messageText || inputMessage.trim();
    if (!message || !selectedModel || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message
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
        system_prompt_type: 'analytics'
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
      // setAbortController(null);
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Аналитический AI</h1>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm ${
                ollamaHealth?.ok 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {ollamaHealth?.ok ? 'AI Online' : 'AI Offline'}
                {ollamaHealth?.latency_ms && ` (${ollamaHealth.latency_ms}ms)`}
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {showHistory ? 'Скрыть' : 'Показать'} историю
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Модель
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
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID сессии
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
                Новая сессия
              </button>
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Быстрые запросы</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analyticsPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => sendMessage(prompt.prompt)}
                className="p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                disabled={isLoading}
              >
                <div className="font-medium text-gray-800">{prompt.title}</div>
                <div className="text-sm text-gray-600 mt-1">{prompt.prompt}</div>
              </button>
            ))}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">История сессии</h3>
              <button
                onClick={loadHistory}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Загрузить историю
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Загрузить предыдущие сообщения для сессии: {convoId}
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
                className={`max-w-2xl px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {message.role === 'user' ? 'Вы' : 'Аналитик AI'}
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
                  <span>Анализирую...</span>
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
              placeholder="Опишите задачу для анализа данных..."
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
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || !selectedModel}
                className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Анализировать
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
