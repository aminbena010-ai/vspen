/**
 * ============================================
 * SANDBOX MANAGER - Iframe Lifecycle
 * Gestión segura del iframe de preview con aislamiento
 * ============================================
 */

class SandboxManager {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;

    /** @type {HTMLIFrameElement|null} */
    this._iframe = null;

    /** @type {boolean} */
    this._isReady = false;

    /** @type {number} Contador de recargas para cache-busting */
    this._loadCount = 0;

    /** @type {AbortController|null} Para cancelar cargas pendientes */
    this._pendingLoad = null;

    // Bindings persistentes
    this._boundOnLoad = this._onIframeLoad.bind(this);
    this._boundOnError = this._onIframeError.bind(this);
  }

  /**
   * Montar sobre un elemento iframe existente
   * @param {HTMLIFrameElement} iframeElement
   */
  mount(iframeElement) {
    if (!iframeElement || iframeElement.tagName !== 'IFRAME') {
      throw new Error('SandboxManager.mount: Se requiere un elemento <iframe> válido');
    }

    this._iframe = iframeElement;

    // Configurar sandbox restrictivo
    this._iframe.setAttribute('sandbox', 'allow-scripts allow-modals allow-same-origin');
    this._iframe.setAttribute('loading', 'lazy');
    this._iframe.setAttribute('title', 'VSPen Preview');

    // Registrar eventos del iframe
    this._iframe.addEventListener('load', this._boundOnLoad);
    this._iframe.addEventListener('error', this._boundOnError);

    console.log('[SandboxManager] Iframe montado correctamente');
  }

  /**
   * Cargar HTML completo en el iframe
   * @param {string} html - Documento HTML completo
   * @returns {Promise<void>}
   */
  async loadHTML(html) {
    if (!this._iframe) {
      throw new Error('SandboxManager.loadHTML: Iframe no montado. Llama a mount() primero.');
    }

    // Cancelar carga anterior si existe
    if (this._pendingLoad) {
      this._pendingLoad.abort();
    }

    this._pendingLoad = new AbortController();
    this._isReady = false;
    this._loadCount++;

    this._eventBus.emit(VSPenConstants.EVENTS.COMPILE_STARTED, {
      loadId: this._loadCount
    });

    try {
      // Usar srcdoc para inyección segura sin navegación real
      this._iframe.srcdoc = html;

      // Esperar a que cargue con timeout
      await this._waitForLoad(10000);

      this._isReady = true;
      this._eventBus.emit(VSPenConstants.EVENTS.PREVIEW_READY, {
        loadId: this._loadCount
      });

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[SandboxManager] Error cargando preview:', err);
        this._eventBus.emit(VSPenConstants.EVENTS.PREVIEW_ERROR, {
          error: err.message,
          loadId: this._loadCount
        });
      }
    } finally {
      this._pendingLoad = null;
    }
  }

  /**
   * Recargar el iframe actual
   */
  reload() {
    if (!this._iframe) return;

    const currentSrcdoc = this._iframe.srcdoc;
    if (currentSrcdoc) {
      this.loadHTML(currentSrcdoc);
    } else {
      this._iframe.contentWindow?.location.reload();
    }
  }

  /**
   * Limpiar el iframe (pantalla en blanco)
   */
  clear() {
    if (!this._iframe) return;

    this._isReady = false;
    this._iframe.srcdoc = '<!DOCTYPE html><html><body></body></html>';
  }

  /**
   * Verificar si el iframe está listo
   * @returns {boolean}
   */
  isReady() {
    return this._isReady;
  }

  /**
   * Obtener referencia al contentWindow (uso cauteloso)
   * @returns {Window|null}
   */
  getContentWindow() {
    try {
      return this._iframe?.contentWindow || null;
    } catch {
      // Cross-origin o sandbox restrictivo
      return null;
    }
  }

  /**
   * Ejecutar script dentro del sandbox
   * @param {string} code - JavaScript a ejecutar
   * @returns {boolean} true si se ejecutó
   */
  executeScript(code) {
    const win = this.getContentWindow();
    if (!win || !this._isReady) return false;

    try {
      win.eval(code);
      return true;
    } catch (err) {
      console.error('[SandboxManager] Error ejecutando script en sandbox:', err);
      this._eventBus.emit(VSPenConstants.EVENTS.PREVIEW_ERROR, {
        error: `Runtime error: ${err.message}`
      });
      return false;
    }
  }

  /**
   * Obtir estadísticas del iframe
   * @returns {Object}
   */
  getStats() {
    return {
      isReady: this._isReady,
      loadCount: this._loadCount,
      hasIframe: this._iframe !== null,
      srcdocLength: this._iframe?.srcdoc?.length || 0
    };
  }

  /**
   * Destruir y limpiar recursos
   */
  destroy() {
    if (this._pendingLoad) {
      this._pendingLoad.abort();
      this._pendingLoad = null;
    }

    if (this._iframe) {
      this._iframe.removeEventListener('load', this._boundOnLoad);
      this._iframe.removeEventListener('error', this._boundOnError);
      this.clear();
    }

    this._iframe = null;
    this._isReady = false;
  }

  // === PRIVATE METHODS ===

  /**
   * @private
   */
  _onIframeLoad() {
    // El evento load se dispara, pero verificamos readiness vía bridge
    console.log('[SandboxManager] Iframe load event fired');
  }

  /**
   * @private
   */
  _onIframeError(e) {
    console.error('[SandboxManager] Iframe error event:', e);
    this._eventBus.emit(VSPenConstants.EVENTS.PREVIEW_ERROR, {
      error: 'Iframe failed to load'
    });
  }

  /**
   * Esperar a que el iframe termine de cargar
   * @private
   * @param {number} timeoutMs
   * @returns {Promise<void>}
   */
  _waitForLoad(timeoutMs) {
    return new Promise((resolve, reject) => {
      const signal = this._pendingLoad?.signal;

      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Iframe load timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const onLoad = () => {
        cleanup();
        resolve();
      };

      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };

      function cleanup() {
        clearTimeout(timer);
        if (this._iframe) {
          this._iframe.removeEventListener('load', onLoad);
        }
        signal?.removeEventListener('abort', onAbort);
      }

      // Escuchar load directamente en esta promesa también
      this._iframe.addEventListener('load', onLoad, { once: true });
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

if (typeof window !== 'undefined') {
  window.VSPenSandboxManager = SandboxManager;
}