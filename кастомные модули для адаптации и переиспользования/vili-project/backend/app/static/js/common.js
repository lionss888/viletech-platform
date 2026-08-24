/* ============================================
   VILI Common JavaScript
   Theme Toggle & Shared Utilities
   ============================================ */

/**
 * Theme Manager
 * Handles light/dark theme switching with localStorage persistence
 */
class ThemeManager {
  constructor() {
    this.STORAGE_KEY = 'vili-theme';
    this.DARK = 'dark';
    this.LIGHT = 'light';
    this.init();
  }

  init() {
    // Apply saved theme or default to dark
    const savedTheme = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? this.DARK : this.DARK); // Default to dark
    
    this.setTheme(theme, false);
    
    // Setup toggle button
    this.setupToggle();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.setTheme(e.matches ? this.DARK : this.LIGHT, false);
      }
    });
  }

  setTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
      localStorage.setItem(this.STORAGE_KEY, theme);
    }
    
    // Update toggle button visual state
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', theme === this.LIGHT);
      toggle.title = theme === this.DARK ? 'Светлая тема' : 'Тёмная тема';
    }
  }

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || this.DARK;
    const next = current === this.DARK ? this.LIGHT : this.DARK;
    this.setTheme(next);
    
    // Add transition class for smooth change
    document.body.classList.add('theme-transitioning');
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 300);
  }

  setupToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => this.toggle());
    }
  }
}

/**
 * Toast Notification System
 */
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Create container if it doesn't exist
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  }

  show(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-up`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Закрыть">&times;</button>
    `;

    // Add close functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    this.container.appendChild(toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  }

  dismiss(toast) {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'danger', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

/**
 * Skeleton Loader Helper
 */
class SkeletonLoader {
  static create(type = 'text', count = 3) {
    const container = document.createElement('div');
    container.className = 'skeleton-container';

    if (type === 'text') {
      for (let i = 0; i < count; i++) {
        const line = document.createElement('div');
        line.className = 'skeleton skeleton-text';
        if (i === count - 1) {
          line.style.width = '70%';
        }
        container.appendChild(line);
      }
    } else if (type === 'card') {
      const card = document.createElement('div');
      card.className = 'skeleton skeleton-card';
      container.appendChild(card);
    } else if (type === 'message') {
      container.className = 'skeleton-message';
      container.innerHTML = `
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      `;
    }

    return container;
  }
}

/**
 * Animation Helpers
 */
const AnimationHelper = {
  fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let start = null;
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = (timestamp - start) / duration;
      
      element.style.opacity = Math.min(progress, 1);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  },

  fadeOut(element, duration = 300) {
    let start = null;
    const initialOpacity = parseFloat(getComputedStyle(element).opacity);
    
    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const progress = (timestamp - start) / duration;
      
      element.style.opacity = initialOpacity * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
      }
    };
    
    requestAnimationFrame(animate);
  },

  blurIn(element, duration = 400) {
    element.style.animation = `blur-in ${duration}ms ease-out`;
  },

  slideUp(element, duration = 300) {
    element.style.animation = `slide-in-up ${duration}ms ease-out`;
  }
};

/**
 * Debounce utility
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Format date to Russian locale
 */
function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(date).toLocaleDateString('ru-RU', { ...defaultOptions, ...options });
}

/**
 * Format number with Russian locale
 */
function formatNumber(number, options = {}) {
  return new Intl.NumberFormat('ru-RU', options).format(number);
}

/**
 * Copy to clipboard with toast notification
 */
async function copyToClipboard(text, toast) {
  try {
    await navigator.clipboard.writeText(text);
    if (toast) {
      toast.success('Скопировано в буфер обмена');
    }
    return true;
  } catch (err) {
    if (toast) {
      toast.error('Не удалось скопировать');
    }
    return false;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize theme manager
  window.themeManager = new ThemeManager();
  
  // Initialize toast manager
  window.toast = new ToastManager();
  
  // Add smooth transition style for theme changes
  const style = document.createElement('style');
  style.textContent = `
    .theme-transitioning,
    .theme-transitioning * {
      transition: background-color 0.3s ease, 
                  color 0.3s ease, 
                  border-color 0.3s ease,
                  box-shadow 0.3s ease !important;
    }
  `;
  document.head.appendChild(style);
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ThemeManager,
    ToastManager,
    SkeletonLoader,
    AnimationHelper,
    debounce,
    throttle,
    formatDate,
    formatNumber,
    copyToClipboard
  };
}
