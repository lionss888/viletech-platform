// Конфигурация
const API_BASE = '/api/v1';
let messageCount = 0;
let currentFile = null;

// Элементы DOM
const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearChatBtn = document.getElementById('clear-chat');
const fileInput = document.getElementById('file-input');
const fileName = document.getElementById('file-name');

// Настройки
const modelSelect = document.getElementById('model-select');
const useRagCheckbox = document.getElementById('use-rag');
const temperatureSlider = document.getElementById('temperature');
const maxTokensSlider = document.getElementById('max-tokens');
const tempValue = document.getElementById('temp-value');
const tokensValue = document.getElementById('tokens-value');
const msgCount = document.getElementById('msg-count');
const kbCount = document.getElementById('kb-count');

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    console.log('VILI Chat initialized');
    
    // Загружаем статистику базы знаний
    await loadKnowledgeBaseStats();
    
    // Загружаем историю чата из localStorage
    loadChatHistory();
    
    // Обработчики событий
    chatForm.addEventListener('submit', handleSubmit);
    clearChatBtn.addEventListener('click', clearChat);
    fileInput.addEventListener('change', handleFileSelect);
    
    temperatureSlider.addEventListener('input', (e) => {
        tempValue.textContent = e.target.value;
    });
    
    maxTokensSlider.addEventListener('input', (e) => {
        tokensValue.textContent = e.target.value;
    });
    
    // Enter для отправки (Shift+Enter для новой строки)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
});

// Загрузка статистики базы знаний
async function loadKnowledgeBaseStats() {
    try {
        const response = await fetch(`${API_BASE}/knowledge-sources/`, {
            headers: {
                'Authorization': 'Bearer mock-token' // TODO: Реальная аутентификация
            }
        });
        
        if (response.ok) {
            const sources = await response.json();
            const activeCount = sources.filter(s => s.is_active).length;
            kbCount.textContent = `${activeCount} источник${getPlural(activeCount)}`;
        } else {
            kbCount.textContent = 'Недоступно';
        }
    } catch (error) {
        console.error('Failed to load knowledge base stats:', error);
        kbCount.textContent = 'Ошибка';
    }
}

// Обработка отправки формы
async function handleSubmit(e) {
    e.preventDefault();
    
    const message = userInput.value.trim();
    if (!message && !currentFile) return;
    
    // Добавляем сообщение пользователя
    addMessage('user', message);
    messageCount++;
    updateStats();
    
    // Очищаем поле ввода
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Показываем индикатор загрузки
    const loadingId = showLoading();
    
    // Отключаем кнопку отправки
    sendBtn.disabled = true;
    
    try {
        let response;
        
        if (currentFile) {
            // Если есть файл, сначала загружаем его
            response = await handleFileUploadAndAnalyze(message);
        } else {
            // Обычный запрос к ассистенту
            response = await sendChatMessage(message);
        }
        
        // Удаляем индикатор загрузки
        removeLoading(loadingId);
        
        // Добавляем ответ ассистента с ссылками и действиями
        addMessage(
            'assistant', 
            response.answer, 
            response.context_used,
            response.links || null,
            response.actions || null,
            response.intent_type || null
        );
        messageCount++;
        updateStats();
        
        // Сохраняем историю
        saveChatHistory();
        
    } catch (error) {
        removeLoading(loadingId);
        addMessage('error', `Ошибка: ${error.message}`);
        console.error('Chat error:', error);
    } finally {
        sendBtn.disabled = false;
        currentFile = null;
        fileName.textContent = '';
    }
}

// Отправка сообщения в чат
async function sendChatMessage(message) {
    const settings = {
        model: modelSelect.value,
        use_rag: useRagCheckbox.checked,
        temperature: parseFloat(temperatureSlider.value),
        max_tokens: parseInt(maxTokensSlider.value)
    };
    
    const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
            message: message,
            ...settings
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send message');
    }
    
    return await response.json();
}

// Загрузка и анализ файла
async function handleFileUploadAndAnalyze(question) {
    // Сначала загружаем файл
    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('document_type', 'traditional');
    formData.append('customer_id', 'web-chat-user');
    
    const uploadResponse = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer mock-token'
        },
        body: formData
    });
    
    if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
    }
    
    const uploadData = await uploadResponse.json();
    const documentId = uploadData.document_id;
    
    // Анализируем документ
    const analyzeResponse = await fetch(`${API_BASE}/documents/${documentId}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
        },
        body: JSON.stringify({
            document_type: 'traditional',
            include_compliance: true,
            include_risk: true,
            use_rag: useRagCheckbox.checked
        })
    });
    
    if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze document');
    }
    
    const analyzeData = await analyzeResponse.json();
    
    // Формируем ответ
    return {
        answer: formatDocumentAnalysis(analyzeData, question),
        context_used: useRagCheckbox.checked
    };
}

// Форматирование результатов анализа документа
function formatDocumentAnalysis(data, question) {
    let result = '📄 **Анализ документа завершен**\n\n';
    
    if (data.document_type) {
        result += `**Тип документа:** ${data.document_type}\n`;
    }
    
    if (data.extracted_data) {
        result += '\n**Извлеченные данные:**\n';
        result += JSON.stringify(data.extracted_data, null, 2);
    }
    
    if (data.compliance_status) {
        result += `\n\n**Compliance статус:** ${data.compliance_status}`;
    }
    
    if (data.risk_level) {
        result += `\n**Уровень риска:** ${data.risk_level}`;
    }
    
    if (question) {
        result += `\n\n**Ответ на ваш вопрос:**\n${data.summary || 'Документ обработан успешно.'}`;
    }
    
    return result;
}

// Обработка выбора файла
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        currentFile = file;
        fileName.textContent = `📎 ${file.name}`;
    }
}

// Добавление сообщения в чат
function addMessage(type, content, contextUsed = false, links = null, actions = null, intentType = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    if (type !== 'error') {
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = type === 'user' ? '👤' : '🤖';
        messageDiv.appendChild(avatar);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Форматируем markdown-подобный текст
    const formattedContent = formatMessage(content);
    contentDiv.innerHTML = formattedContent;
    
    // Добавляем ссылки если есть
    if (links && Object.keys(links).length > 0) {
        const linksDiv = document.createElement('div');
        linksDiv.className = 'message-links';
        
        for (const [text, url] of Object.entries(links)) {
            const linkBtn = document.createElement('a');
            linkBtn.href = url;
            linkBtn.className = 'btn-link-inline';
            linkBtn.textContent = text;
            linkBtn.target = '_blank';
            linksDiv.appendChild(linkBtn);
        }
        
        contentDiv.appendChild(linksDiv);
    }
    
    // Добавляем быстрые действия если есть
    if (actions && actions.length > 0) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        actions.forEach(action => {
            const actionBtn = document.createElement('button');
            actionBtn.className = `btn-action btn-action-${action.type || 'link'}`;
            actionBtn.textContent = action.label;
            
            if (action.url) {
                actionBtn.onclick = () => window.open(action.url, '_blank');
            } else if (action.data) {
                actionBtn.onclick = () => handleAction(action);
            }
            
            actionsDiv.appendChild(actionBtn);
        });
        
        contentDiv.appendChild(actionsDiv);
    }
    
    // Добавляем индикатор использования RAG
    if (contextUsed) {
        const ragIndicator = document.createElement('div');
        ragIndicator.className = 'rag-context';
        ragIndicator.textContent = '✓ Использована база знаний';
        contentDiv.appendChild(ragIndicator);
    }
    
    // Добавляем индикатор типа запроса (для отладки)
    if (intentType && intentType !== 'chat') {
        const intentIndicator = document.createElement('div');
        intentIndicator.className = 'intent-indicator';
        intentIndicator.textContent = `📌 ${formatIntentType(intentType)}`;
        contentDiv.appendChild(intentIndicator);
    }
    
    // Добавляем время
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    contentDiv.appendChild(timeDiv);
    
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // Прокручиваем вниз
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Обработка действий
function handleAction(action) {
    console.log('Action triggered:', action);
    
    if (action.type === 'create' && action.data?.entity === 'form_payment') {
        // Можно добавить открытие модального окна создания заявки
        alert('Создание заявки: функция в разработке');
    }
}

// Форматирование типа намерения
function formatIntentType(type) {
    const labels = {
        'operator_analytics': 'Аналитика оператора',
        'operator_list': 'Список операторов',
        'operator_compare': 'Сравнение',
        'operator_statistics': 'Статистика',
        'create_report': 'Отчёт',
        'list_form_payments': 'Заявки',
        'get_form_payment_status': 'Статус заявки',
        'create_form_payment': 'Новая заявка'
    };
    return labels[type] || type;
}

// Форматирование текста сообщения
function formatMessage(text) {
    // Экранируем HTML
    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Форматирование жирного текста
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Форматирование markdown ссылок [текст](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="inline-link">$1</a>');
    
    // Форматирование нумерованных списков
    text = text.replace(/^(\d+)\. (.+)$/gm, '<li value="$1">$2</li>');
    
    // Форматирование маркированных списков
    text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
    
    // Оборачиваем списки
    text = text.replace(/(<li[^>]*>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Убираем вложенные ul
    text = text.replace(/<\/ul>\s*<ul>/g, '');
    
    // Форматирование блоков кода
    text = text.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Форматирование переносов строк
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    text = '<p>' + text + '</p>';
    
    // Очистка пустых параграфов
    text = text.replace(/<p><\/p>/g, '');
    text = text.replace(/<p><br><\/p>/g, '');
    
    return text;
}

// Показать индикатор загрузки
function showLoading() {
    const loadingDiv = document.createElement('div');
    const loadingId = 'loading-' + Date.now();
    loadingDiv.id = loadingId;
    loadingDiv.className = 'message loading-message';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    loadingDiv.appendChild(avatar);
    
    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'loading-dots';
    dotsDiv.innerHTML = '<span></span><span></span><span></span>';
    loadingDiv.appendChild(dotsDiv);
    
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return loadingId;
}

// Удалить индикатор загрузки
function removeLoading(loadingId) {
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Очистка чата
function clearChat() {
    if (confirm('Вы уверены, что хотите очистить историю чата?')) {
        // Удаляем все сообщения кроме приветствия
        const messages = messagesContainer.querySelectorAll('.message:not(.system-message)');
        messages.forEach(msg => msg.remove());
        
        messageCount = 0;
        updateStats();
        
        localStorage.removeItem('vili_chat_history');
    }
}

// Обновление статистики
function updateStats() {
    msgCount.textContent = messageCount;
}

// Сохранение истории чата
function saveChatHistory() {
    const messages = [];
    document.querySelectorAll('.message:not(.system-message):not(.loading-message)').forEach(msg => {
        const isUser = msg.classList.contains('user-message');
        const content = msg.querySelector('.message-content').textContent.trim();
        messages.push({ type: isUser ? 'user' : 'assistant', content });
    });
    
    localStorage.setItem('vili_chat_history', JSON.stringify(messages));
}

// Загрузка истории чата
function loadChatHistory() {
    const history = localStorage.getItem('vili_chat_history');
    if (history) {
        try {
            const messages = JSON.parse(history);
            messages.forEach(msg => {
                addMessage(msg.type, msg.content);
                messageCount++;
            });
            updateStats();
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }
}

// Вспомогательная функция для склонения
function getPlural(number) {
    const cases = ['', 'а', 'ов'];
    if (number % 10 === 1 && number % 100 !== 11) {
        return cases[0];
    } else if ([2, 3, 4].includes(number % 10) && ![12, 13, 14].includes(number % 100)) {
        return cases[1];
    } else {
        return cases[2];
    }
}
