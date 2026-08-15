/**
 * ============================================
 * THEME ENGINE - Dark/Light Switch + Variables CSS
 * Gestión de temas con persistencia y transiciones suaves
 * ============================================
 */

class ThemeEngine {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   * @param {import('../core/storage-service').StorageService} storage
   */
  constructor(eventBus, storage) {
    this._eventBus = eventBus;
    this._storage = storage;
    
    /** @type {Map<string, string>} Temas registrados */
    this._themes = new Map([
      ['dark-default', 'Dark Default'],
      ['light-default', 'Light Default']
    ]);
    
    /** @type {string} Tema activo */
    this._currentTheme = this._storage.get(VSPenConstants.STORAGE.THEME, 'dark-default');
    
    // Aplicar tema inicial sin transición
    document.documentElement.style.transition = 'none';
    this._applyTheme(this._currentTheme);
    
    // Restaurar transiciones después del paint inicial
    requestAnimationFrame(() => {
      document.documentElement.style.transition = '';
    });
  }

  /**
   * Cambiar tema
   * @param {string} themeId 
   */
  setTheme(themeId) {
    if (!this._themes.has(themeId)) {
      console.warn(`[ThemeEngine] Tema "${themeId}" no registrado`);
      return;
    }
    
    this._currentTheme = themeId;
    this._applyTheme(themeId);
    this._storage.set(VSPenConstants.STORAGE.THEME, themeId);
    this._eventBus.emit(VSPenConstants.EVENTS.THEME_CHANGED, { theme: themeId });
  }

  /**
   * Toggle entre dark/light
   */
  toggle() {
    const next = this._currentTheme === 'dark-default' ? 'light-default' : 'dark-default';
    this.setTheme(next);
  }

  /**
   * Obtener tema actual
   * @returns {string}
   */
  getCurrentTheme() {
    return this._currentTheme;
  }

  /**
   * Obtener lista de temas disponibles
   * @returns {Array<{id: string, label: string}>}
   */
  getAvailableThemes() {
    return Array.from(this._themes.entries()).map(([id, label]) => ({ id, label }));
  }

  /**
   * Registrar tema personalizado
   * @param {string} id 
   * @param {string} label 
   */
  registerTheme(id, label) {
    this._themes.set(id, label);
  }

  /**
   * Obtener valor de variable CSS actual
   * @param {string} varName - Sin "--" prefix
   * @returns {string}
   */
  getVariable(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
  }

  // === PRIVATE ===

  _applyTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
  }
}

if (typeof window !== 'undefined') {
  window.VSPenThemeEngine = ThemeEngine;
}