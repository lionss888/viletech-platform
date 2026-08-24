// VILI Admin JavaScript

const API_BASE = window.location.origin + '/api/v1';

// Initialize theme toggle for admin panel
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      if (window.themeManager) {
        window.themeManager.toggle();
        // Update icon
        const icon = themeToggle.querySelector('i');
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'light') {
          icon.className = 'fas fa-sun';
          themeToggle.querySelector('span').textContent = 'Светлая';
        } else {
          icon.className = 'fas fa-moon';
          themeToggle.querySelector('span').textContent = 'Тёмная';
        }
      }
    });
    
    // Set initial icon
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const icon = themeToggle.querySelector('i');
    if (currentTheme === 'light') {
      icon.className = 'fas fa-sun';
      themeToggle.querySelector('span').textContent = 'Светлая';
    } else {
      icon.className = 'fas fa-moon';
      themeToggle.querySelector('span').textContent = 'Тёмная';
    }
  }
  
  // Mobile menu toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.querySelector('.sidebar-overlay');
  
  if (mobileMenuToggle && sidebar) {
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      const icon = mobileMenuToggle.querySelector('i');
      if (sidebar.classList.contains('open')) {
        icon.className = 'fas fa-times';
        if (sidebarOverlay) sidebarOverlay.style.display = 'block';
      } else {
        icon.className = 'fas fa-bars';
        if (sidebarOverlay) sidebarOverlay.style.display = 'none';
      }
    };
    
    mobileMenuToggle.addEventListener('click', toggleSidebar);
    
    // Close sidebar when clicking overlay
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        mobileMenuToggle.querySelector('i').className = 'fas fa-bars';
        sidebarOverlay.style.display = 'none';
      });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024 && 
          sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          !mobileMenuToggle.contains(e.target) &&
          !sidebarOverlay.contains(e.target)) {
        toggleSidebar();
      }
    });
  }
});

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab and button
        button.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});

// URL form submission
document.getElementById('url-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        source_type: 'url',
        source_url: formData.get('source_url'),
        description: formData.get('description') || null,
        auto_refresh: formData.get('auto_refresh') === 'on',
        category: formData.get('category') || null
    };
    
    try {
        showMessage('Добавление источника...', 'info');
        
        const response = await fetch(`${API_BASE}/knowledge-sources/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('Failed to create source');
        }
        
        const result = await response.json();
        showMessage(`Источник "${result.name}" успешно добавлен! Создано ${result.chunks_count} фрагментов.`, 'success');
        e.target.reset();
        loadSources();
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
});

// File form submission
document.getElementById('file-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('file-name').value);
    formData.append('file', document.getElementById('file-upload').files[0]);
    
    const description = document.getElementById('file-description').value;
    if (description) {
        formData.append('description', description);
    }
    
    try {
        showMessage('Загрузка файла...', 'info');
        
        const response = await fetch(`${API_BASE}/knowledge-sources/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload file');
        }
        
        const result = await response.json();
        showMessage(`Файл "${result.name}" успешно загружен! Создано ${result.chunks_count} фрагментов.`, 'success');
        e.target.reset();
        loadSources();
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
});

// Load sources
async function loadSources() {
    const activeOnly = document.getElementById('active-only').checked;
    const listDiv = document.getElementById('sources-list');
    
    listDiv.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/knowledge-sources/?active_only=${activeOnly}`);
        
        if (!response.ok) {
            throw new Error('Failed to load sources');
        }
        
        const sources = await response.json();
        
        if (sources.length === 0) {
            listDiv.innerHTML = '<p style="text-align: center; color: var(--secondary-color);">Источники не найдены</p>';
            return;
        }
        
        listDiv.innerHTML = '';
        sources.forEach(source => {
            listDiv.appendChild(createSourceCard(source));
        });
    } catch (error) {
        listDiv.innerHTML = `<p style="color: var(--danger-color);">Ошибка загрузки: ${error.message}</p>`;
    }
}

// Create source card
function createSourceCard(source) {
    const card = document.createElement('div');
    card.className = 'source-card';
    
    const statusClass = source.is_active ? 'active' : 'inactive';
    const statusText = source.is_active ? 'Активен' : 'Неактивен';
    
    card.innerHTML = `
        <h3>
            <span class="source-status ${statusClass}"></span>
            ${source.name}
        </h3>
        <span class="source-type ${source.source_type}">${source.source_type.toUpperCase()}</span>
        <div class="source-info">
            ${source.description ? `<p>${source.description}</p>` : ''}
            <p><strong>Фрагментов:</strong> ${source.chunks_count || 0}</p>
            <p><strong>Создан:</strong> ${new Date(source.created_at).toLocaleString('ru-RU')}</p>
            ${source.source_url ? `<p><strong>URL:</strong> <a href="${source.source_url}" target="_blank">${source.source_url}</a></p>` : ''}
            <p><strong>Статус:</strong> ${statusText}</p>
        </div>
        <div class="source-actions">
            <button class="btn btn-secondary btn-small" onclick="viewChunks('${source.id}', '${source.name}')">
                Просмотр фрагментов
            </button>
            <button class="btn btn-success btn-small" onclick="refreshSource('${source.id}')">
                Обновить
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteSource('${source.id}', '${source.name}')">
                Удалить
            </button>
        </div>
    `;
    
    return card;
}

// View chunks
async function viewChunks(sourceId, sourceName) {
    const modal = document.getElementById('chunks-modal');
    const chunksList = document.getElementById('chunks-list');
    const modalTitle = document.getElementById('modal-title');
    
    modalTitle.textContent = `Фрагменты: ${sourceName}`;
    modal.style.display = 'block';
    chunksList.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/knowledge-sources/${sourceId}/chunks`);
        
        if (!response.ok) {
            throw new Error('Failed to load chunks');
        }
        
        const chunks = await response.json();
        
        if (chunks.length === 0) {
            chunksList.innerHTML = '<p style="text-align: center; color: var(--secondary-color);">Фрагменты не найдены</p>';
            return;
        }
        
        chunksList.innerHTML = '';
        chunks.forEach((chunk, index) => {
            const chunkDiv = document.createElement('div');
            chunkDiv.className = 'chunk-item';
            chunkDiv.innerHTML = `
                <strong>Фрагмент ${index + 1}</strong>
                <p>${chunk.content}</p>
                <div class="chunk-meta">
                    ${chunk.metadata ? `<p>Метаданные: ${JSON.stringify(chunk.metadata)}</p>` : ''}
                    <p>Создан: ${new Date(chunk.created_at).toLocaleString('ru-RU')}</p>
                </div>
            `;
            chunksList.appendChild(chunkDiv);
        });
    } catch (error) {
        chunksList.innerHTML = `<p style="color: var(--danger-color);">Ошибка загрузки: ${error.message}</p>`;
    }
}

// Refresh source
async function refreshSource(sourceId) {
    if (!confirm('Обновить источник? Это перезагрузит контент и пересоздаст фрагменты.')) {
        return;
    }
    
    try {
        showMessage('Обновление источника...', 'info');
        
        const response = await fetch(`${API_BASE}/knowledge-sources/${sourceId}/refresh`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to refresh source');
        }
        
        const result = await response.json();
        showMessage(`Источник обновлен! Создано ${result.chunks_created} фрагментов.`, 'success');
        loadSources();
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

// Delete source
async function deleteSource(sourceId, sourceName) {
    if (!confirm(`Удалить источник "${sourceName}"? Это действие нельзя отменить.`)) {
        return;
    }
    
    try {
        showMessage('Удаление источника...', 'info');
        
        const response = await fetch(`${API_BASE}/knowledge-sources/${sourceId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete source');
        }
        
        showMessage(`Источник "${sourceName}" успешно удален.`, 'success');
        loadSources();
    } catch (error) {
        showMessage(`Ошибка: ${error.message}`, 'error');
    }
}

// Show message
function showMessage(text, type) {
    const messageDiv = document.getElementById('form-message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    if (type !== 'info') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Modal close
document.querySelector('.close').addEventListener('click', () => {
    document.getElementById('chunks-modal').style.display = 'none';
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('chunks-modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Event listeners
document.getElementById('active-only').addEventListener('change', loadSources);
document.getElementById('refresh-list').addEventListener('click', loadSources);

// Load sources on page load
window.addEventListener('DOMContentLoaded', loadSources);
