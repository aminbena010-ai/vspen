/**
 * ============================================
 * LAYOUT ENGINE - Paneles Redimensionables + Persistencia
 * Gestión de layout tipo VS Code con drag & drop
 * ============================================
 */

class LayoutEngine {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   * @param {import('../core/storage-service').StorageService} storage
   */
  constructor(eventBus, storage) {
    this._eventBus = eventBus;
    this._storage = storage;
    
    /** @type {Map<string, ResizeObserver>} */
    this._observers = new Map();
    
    /** @type {Object} Estado actual del layout */
    this._state = this._loadState();
    
    this._applyState();
  }

  /**
   * Inicializar resize handle entre dos paneles
   * @param {Object} config
   * @param {HTMLElement} config.handle - Elemento arrastrable
   * @param {HTMLElement} config.primary - Panel izquierdo/superior
   * @param {HTMLElement} config.secondary - Panel derecho/inferior
   * @param {'horizontal'|'vertical'} [config.direction='horizontal']
   * @param {string} config.storageKey - Clave para persistir tamaño
   * @param {number} [config.minPrimary=100] - Tamaño mínimo px
   * @param {number} [config.maxPrimary=Infinity] - Tamaño máximo px
   */
  initResizeHandle(config) {
    const { handle, primary, secondary, direction = 'horizontal', storageKey, minPrimary = 100, maxPrimary = Infinity } = config;
    
    let isDragging = false;
    let startPos = 0;
    let startSize = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      startPos = direction === 'horizontal' ? e.clientX : e.clientY;
      startSize = direction === 'horizontal' ? primary.offsetWidth : primary.offsetHeight;
      
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      handle.classList.add('dragging');
      
      // Deshabilitar pointer events en iframes durante drag
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(f => f.style.pointerEvents = 'none');
      
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos;
      let newSize = startSize + delta;
      
      // Aplicar límites
      newSize = Math.max(minPrimary, Math.min(maxPrimary, newSize));
      
      if (direction === 'horizontal') {
        primary.style.width = `${newSize}px`;
        primary.style.flex = `0 0 ${newSize}px`;
      } else {
        primary.style.height = `${newSize}px`;
        primary.style.flex = `0 0 ${newSize}px`;
      }
      
      this._eventBus.emit(VSPenConstants.EVENTS.LAYOUT_RESIZED, { key: storageKey, size: newSize });
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      handle.classList.remove('dragging');
      
      // Restaurar pointer events en iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(f => f.style.pointerEvents = '');
      
      // Persistir
      const finalSize = direction === 'horizontal' ? primary.offsetWidth : primary.offsetHeight;
      this._savePanelSize(storageKey, finalSize);
    };

    handle.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Cleanup function
    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  /**
   * Toggle visibilidad de sidebar
   */
  toggleSidebar() {
    this._state.sidebarVisible = !this._state.sidebarVisible;
    this._applyState();
    this._persistState();
    this._eventBus.emit(VSPenConstants.EVENTS.SIDEBAR_TOGGLED, { visible: this._state.sidebarVisible });
  }

  /**
   * Obtener estado actual
   * @returns {Object}
   */
  getState() {
    return { ...this._state };
  }

  /**
   * Resetear a defaults
   */
  reset() {
    this._state = this._getDefaultState();
    this._applyState();
    this._persistState();
  }

  // === PRIVATE ===

  _getDefaultState() {
    return {
      sidebarWidth: VSPenConstants.LAYOUT.SIDEBAR_WIDTH_DEFAULT,
      sidebarVisible: true,
      editorSplitPercent: 50
    };
  }

  _loadState() {
    const saved = this._storage.get(VSPenConstants.STORAGE.LAYOUT_STATE, null);
    return saved ? { ...this._getDefaultState(), ...saved } : this._getDefaultState();
  }

  _persistState() {
    this._storage.set(VSPenConstants.STORAGE.LAYOUT_STATE, this._state);
  }

  _savePanelSize(key, size) {
    this._state[key] = size;
    this._persistState();
  }

  _applyState() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.width = this._state.sidebarVisible ? `${this._state.sidebarWidth}px` : '0';
      sidebar.classList.toggle('collapsed', !this._state.sidebarVisible);
    }
  }
}

if (typeof window !== 'undefined') {
  window.VSPenLayoutEngine = LayoutEngine;
}