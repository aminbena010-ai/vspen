/**
 * ============================================
 * ICON REGISTRY - SVGs Inline por Nombre
 * Sistema centralizado de iconos SVG optimizados
 * ============================================
 */

class IconRegistry {
  constructor() {
    /** @type {Map<string, string>} SVG paths por nombre */
    this._icons = new Map();
    this._registerDefaults();
  }

  /**
   * Obtener SVG inline completo
   * @param {string} name - Nombre del icono
   * @param {number} [size=24] - Tamaño en px
   * @param {string} [className=''] - Clase CSS adicional
   * @returns {string} HTML string del SVG
   */
  get(name, size = 24, className = '') {
    const path = this._icons.get(name);
    if (!path) {
      console.warn(`[IconRegistry] Icono "${name}" no encontrado`);
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="${className}"><circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.3"/></svg>`;
    }
    
    const cls = className ? ` class="${className}"` : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"${cls}>${path}</svg>`;
  }

  /**
   * Registrar icono personalizado
   * @param {string} name 
   * @param {string} svgPath - Contenido interno del <svg> (paths, circles, etc.)
   */
  register(name, svgPath) {
    this._icons.set(name, svgPath);
  }

  /**
   * Verificar si existe icono
   * @param {string} name 
   * @returns {boolean}
   */
  has(name) {
    return this._icons.has(name);
  }

  /**
   * Listar todos los iconos registrados
   * @returns {string[]}
   */
  list() {
    return Array.from(this._icons.keys());
  }

  // === PRIVATE ===

  _registerDefaults() {
    // File Explorer
    this._icons.set('explorer', '<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>');
    this._icons.set('search', '<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>');
    this._icons.set('git', '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/>');
    this._icons.set('settings', '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.61 3.61 0 018.4 12 3.61 3.61 0 0112 8.4a3.61 3.61 0 013.6 3.6 3.61 3.61 0 01-3.6 3.6z"/>');
    
    // Files
    this._icons.set('file-ts', '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><text x="7" y="17" font-size="7" fill="#519aba" font-weight="bold">TS</text>');
    this._icons.set('file-js', '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><text x="7" y="17" font-size="7" fill="#f1e05a" font-weight="bold">JS</text>');
    this._icons.set('file-css', '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><text x="6" y="17" font-size="6" fill="#563d7c" font-weight="bold">CSS</text>');
    this._icons.set('file-html', '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><text x="5" y="17" font-size="5" fill="#e34c26" font-weight="bold">HTML</text>');
    this._icons.set('file-generic', '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>');
    this._icons.set('folder', '<path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>');
    
    // Actions
    this._icons.set('close', '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>');
    this._icons.set('refresh', '<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>');
    this._icons.set('external-link', '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>');
    this._icons.set('chevron-right', '<polyline points="9 18 15 12 9 6"/>');
    this._icons.set('plus', '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>');
    this._icons.set('trash', '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>');
  }
}

if (typeof window !== 'undefined') {
  window.VSPenIconRegistry = IconRegistry;
}