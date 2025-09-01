// Utility functions for BINAH Frontend
export class Utils {
  // Debounce function to limit API calls
  static debounce(func, wait) {
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

  // Throttle function for scroll events
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Safe HTML escaping to prevent XSS
  static escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // Strip HTML tags for preview text
  static stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

  // Format date for display
  static formatDate(dateString) {
    if (!dateString) return 'Data não informada';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Generate unique IDs
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Local storage with error handling
  static getFromStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading from localStorage for key "${key}":`, error);
      return defaultValue;
    }
  }

  static saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Error writing to localStorage for key "${key}":`, error);
      return false;
    }
  }

  // Animate element with CSS classes
  static animate(element, animationClass, duration = 300) {
    return new Promise((resolve) => {
      element.classList.add(animationClass);
      setTimeout(() => {
        element.classList.remove(animationClass);
        resolve();
      }, duration);
    });
  }

  // Smooth scroll to element
  static scrollToElement(element, offset = 0) {
    if (!element) return;
    
    const elementPosition = element.offsetTop;
    const offsetPosition = elementPosition - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }

  // Check if element is in viewport
  static isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
      rect.top >= -threshold &&
      rect.left >= -threshold &&
      rect.bottom <= windowHeight + threshold &&
      rect.right <= windowWidth + threshold
    );
  }

  // Copy text to clipboard
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        console.warn('Could not copy text to clipboard:', err);
        return false;
      }
    }
  }

  // Validate form data
  static validateTopic(data) {
    const errors = [];
    
    if (!data.title || data.title.trim().length < 3) {
      errors.push('Título deve ter pelo menos 3 caracteres');
    }
    
    if (!data.category || data.category.trim() === '') {
      errors.push('Categoria é obrigatória');
    }
    
    if (!data.content || data.content.trim().length < 10) {
      errors.push('Conteúdo deve ter pelo menos 10 caracteres');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Search highlighting
  static highlightText(text, searchTerm) {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${Utils.escapeRegex(searchTerm)})`, 'gi');
    return text.replace(regex, '<mark class="highlight">$1</mark>');
  }

  // Escape regex special characters
  static escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Performance monitoring
  static performanceMonitor = {
    timers: new Map(),
    
    start(label) {
      this.timers.set(label, performance.now());
    },
    
    end(label) {
      const startTime = this.timers.get(label);
      if (startTime) {
        const duration = performance.now() - startTime;
        console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
        this.timers.delete(label);
        return duration;
      }
      return 0;
    }
  };
}