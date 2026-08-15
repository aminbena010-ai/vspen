/**
 * ============================================
 * HOT RELOAD - Inyección Incremental Sin Recarga
 * Actualización parcial del preview cuando es posible
 * ============================================
 */

class HotReload {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   * @param {import('./sandbox-manager').SandboxManager} sandbox
   * @param {import('./preview-bridge').PreviewBridge} bridge
   */
  constructor(eventBus, sandbox, bridge) {
    this._eventBus = eventBus;
    this._sandbox = sandbox;
    this._bridge = bridge;

    /** @type {string|null} Hash del último CSS inyectado */
    this._lastCSSHash = null;

    /** @type {string|null} Hash del último JS compilado */
    this._lastJSHash = null;

    /** @type {boolean} Si el hot reload está habilitado */
    this._enabled = true;

    /** @type {number} Contador de full reloads consecutivos */
    this._fullReloadCount = 0;

    /** @type {number} Máximo de hot reloads antes de forzar full reload */
    this._maxHotReloads = 50;

    // Registrar listener de compilación exitosa
    this._unsubscribeCompileSuccess = this._eventBus.on(
      VSPenConstants.EVENTS.COMPILE_SUCCESS,
      (data) => this._onCompileSuccess(data)
    );
  }

  /**
   * Habilitar/deshabilitar hot reload
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = Boolean(enabled);
  }

  /**
   * Verificar si hot reload está habilitado
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Forzar full reload (resetear contadores)
   */
  forceFullReload() {
    this._fullReloadCount = 0;
    this._lastCSSHash = null;
    this._lastJSHash = null;
    this._sandbox.reload();
  }

  /**
   * Resetear estado interno
   */
  reset() {
    this._lastCSSHash = null;
    this._lastJSHash = null;
    this._fullReloadCount = 0;
  }

  /**
   * Obtener estadísticas
   * @returns {Object}
   */
  getStats() {
    return {
      enabled: this._enabled,
      fullReloadCount: this._fullReloadCount,
      hasCSSCache: this._lastCSSHash !== null,
      hasJSCache: this._lastJSHash !== null
    };
  }

  /**
   * Destruir y limpiar
   */
  destroy() {
    if (this._unsubscribeCompileSuccess) {
      this._unsubscribeCompileSuccess();
      this._unsubscribeCompileSuccess = null;
    }
    this.reset();
  }

  // === PRIVATE METHODS ===

  /**
   * Manejar compilación exitosa: decidir entre hot reload o full reload
   * @private
   */
  _onCompileSuccess(data) {
    if (!this._enabled || !this._sandbox.isReady()) return;

    const { js, css, fullHTML } = data;

    const jsHash = this._simpleHash(js || '');
    const cssHash = this._simpleHash(css || '');

    const jsChanged = jsHash !== this._lastJSHash;
    const cssChanged = cssHash !== this._lastCSSHash;

    // Si nada cambió, no hacer nada
    if (!jsChanged && !cssChanged) return;

    // Decidir estrategia
    const canHotReload = this._canHotReload(jsChanged, cssChanged);

    if (canHotReload) {
      this._performHotReload(js, css, jsChanged, cssChanged);
    } else {
      this._performFullReload(fullHTML);
    }

    // Actualizar hashes
    if (jsChanged) this._lastJSHash = jsHash;
    if (cssChanged) this._lastCSSHash = cssHash;
  }

  /**
   * Determinar si se puede hacer hot reload
   * @private
   */
  _canHotReload(jsChanged, cssChanged) {
    // Solo CSS → siempre hot reload
    if (!jsChanged && cssChanged) return true;

    // JS cambió → verificar condiciones
    if (jsChanged) {
      // Demasiados hot reloads consecutivos → forzar full
      if (this._fullReloadCount >= this._maxHotReloads) return false;

      // Si el bridge no está listo → full reload
      if (!this._bridge.isConnected()) return false;

      return true;
    }

    return false;
  }

  /**
   * Ejecutar hot reload parcial
   * @private
   */
  _performHotReload(js, css, jsChanged, cssChanged) {
    console.log('[HotReload] Partial update:', { jsChanged, cssChanged });

    // Hot reload CSS: reemplazar stylesheet in-place
    if (cssChanged && css) {
      const cssInjection = [
        '(function(){',
        '  var style = document.getElementById("vspen-hot-css");',
        '  if (!style) {',
        '    style = document.createElement("style");',
        '    style.id = "vspen-hot-css";',
        '    document.head.appendChild(style);',
        '  }',
        '  style.textContent = ' + JSON.stringify(css) + ';',
        '})()'
      ].join('\n');

      this._sandbox.executeScript(cssInjection);
    }

    // Hot reload JS: re-renderizar React component tree
    if (jsChanged && js) {
      const jsInjection = [
        '(function(){',
        '  try {',
        '    var root = document.getElementById("root");',
        '    if (root && window.ReactDOM && window.React) {',
        '      // Limpiar root y re-ejecutar',
        '      root.innerHTML = "";',
        '      var newRoot = ReactDOM.createRoot(root);',
        '      ' + js,
        '    } else {',
        '      // Fallback: evaluar directamente',
        '      eval(' + JSON.stringify(js) + ');',
        '    }',
        '    if (window.__VSPenBridge) {',
        '      window.__VSPenBridge.send("__hot_reload_success__", { type: "js" });',
        '    }',
        '  } catch(err) {',
        '    if (window.__VSPenBridge) {',
        '      window.__VSPenBridge.send("__runtime_error__", {',
        '        message: err.message,',
        '        stack: err.stack',
        '      });',
        '    }',
        '  }',
        '})()'
      ].join('\n');

      this._sandbox.executeScript(jsInjection);
    }

    this._fullReloadCount++;
  }

  /**
   * Ejecutar full reload completo
   * @private
   */
  _performFullReload(html) {
    console.log('[HotReload] Full reload triggered');

    this._fullReloadCount = 0;
    this._lastCSSHash = null;
    this._lastJSHash = null;

    this._sandbox.loadHTML(html).then(() => {
      // Re-inicializar bridge después del full reload
      this._bridge.initializeSandbox();
    });
  }

  /**
   * Hash simple y rápido para detección de cambios
   * No necesita ser criptográfico, solo detectar diferencias
   * @private
   */
  _simpleHash(str) {
    if (!str) return '';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convertir a int32
    }
    return hash.toString(36);
  }
}

if (typeof window !== 'undefined') {
  window.VSPenHotReload = HotReload;
}