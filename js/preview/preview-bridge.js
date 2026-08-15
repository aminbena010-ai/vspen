/**
 * ============================================
 * PREVIEW BRIDGE - Protocolo postMessage Bidireccional
 * Comunicación segura entre IDE y sandbox iframe
 * ============================================
 */

class PreviewBridge {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   * @param {import('./sandbox-manager').SandboxManager} sandbox
   */
  constructor(eventBus, sandbox) {
    this._eventBus = eventBus;
    this._sandbox = sandbox;

    /** @type {Map<string, Function>} Handlers registrados por tipo de mensaje */
    this._handlers = new Map();

    /** @type {string} Identificador único de esta instancia del IDE */
    this._instanceId = 'vspen_' + Date.now().toString(36);

    /** @type {number} Timeout para respuestas del bridge */
    this._responseTimeout = 5000;

    /** @type {Map<number, {resolve: Function, reject: Function, timer: number}>} */
    this._pendingRequests = new Map();

    this._requestCounter = 0;

    // Binding persistente
    this._boundOnMessage = this._onMessage.bind(this);

    // Escuchar mensajes entrantes
    window.addEventListener('message', this._boundOnMessage);

    // Registrar handlers internos
    this._registerInternalHandlers();
  }

  /**
   * Enviar mensaje al sandbox y esperar respuesta
   * @param {string} type - Tipo de mensaje
   * @param {*} payload - Datos a enviar
   * @returns {Promise<*>} Respuesta del sandbox
   */
  async send(type, payload = null) {
    const win = this._sandbox.getContentWindow();
    if (!win || !this._sandbox.isReady()) {
      throw new Error('PreviewBridge.send: Sandbox no disponible');
    }

    const requestId = ++this._requestCounter;

    const message = {
      source: this._instanceId,
      type,
      payload,
      requestId,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRequests.delete(requestId);
        reject(new Error(`Bridge request "${type}" timed out after ${this._responseTimeout}ms`));
      }, this._responseTimeout);

      this._pendingRequests.set(requestId, { resolve, reject, timer });

      try {
        win.postMessage(message, '*');
      } catch (err) {
        clearTimeout(timer);
        this._pendingRequests.delete(requestId);
        reject(err);
      }
    });
  }

  /**
   * Enviar mensaje al sandbox sin esperar respuesta (fire-and-forget)
   * @param {string} type
   * @param {*} payload
   */
  notify(type, payload = null) {
    const win = this._sandbox.getContentWindow();
    if (!win || !this._sandbox.isReady()) return;

    const message = {
      source: this._instanceId,
      type,
      payload,
      requestId: null,
      timestamp: Date.now()
    };

    try {
      win.postMessage(message, '*');
    } catch (err) {
      console.warn('[PreviewBridge] Error enviando notificación:', err);
    }
  }

  /**
   * Registrar handler para mensajes entrantes del sandbox
   * @param {string} type - Tipo de mensaje a escuchar
   * @param {Function} handler - Callback(payload, respond)
   * @returns {Function} Función de desregistro
   */
  on(type, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('PreviewBridge.on: handler debe ser función');
    }

    this._handlers.set(type, handler);

    return () => {
      this._handlers.delete(type);
    };
  }

  /**
   * Verificar si el bridge está conectado
   * @returns {boolean}
   */
  isConnected() {
    return this._sandbox.isReady();
  }

  /**
   * Generar código JS para inyectar en el sandbox que establece el lado del bridge
   * Este código DEBE incluirse en el HTML del preview
   * @returns {string} JavaScript inyectable
   */
  generateBridgeClientCode() {
    return [
      '(function(){',
      '  var VSPEN_BRIDGE = {',
      '    _handlers: {},',
      '    _instanceId: null,',
      '',
      '    init: function(instanceId) {',
      '      this._instanceId = instanceId;',
      '      window.addEventListener("message", this._onMessage.bind(this));',
      '      this._send("__bridge_ready__", null);',
      '    },',
      '',
      '    on: function(type, handler) {',
      '      this._handlers[type] = handler;',
      '    },',
      '',
      '    send: function(type, payload) {',
      '      this._send(type, payload);',
      '    },',
      '',
      '    _send: function(type, payload, requestId) {',
      '      window.parent.postMessage({',
      '        source: "vspen_sandbox",',
      '        type: type,',
      '        payload: payload,',
      '        requestId: requestId || null,',
      '        timestamp: Date.now()',
      '      }, "*");',
      '    },',
      '',
      '    _onMessage: function(e) {',
      '      var msg = e.data;',
      '      if (!msg || !msg.type) return;',
      '',
      '      // Responder a requests del IDE',
      '      var handler = this._handlers[msg.type];',
      '      if (handler && msg.requestId) {',
      '        try {',
      '          var result = handler(msg.payload);',
      '          this._send("__response__", result, msg.requestId);',
      '        } catch(err) {',
      '          this._send("__error__", { message: err.message }, msg.requestId);',
      '        }',
      '        return;',
      '      }',
      '',
      '      // Notificaciones sin response',
      '      if (handler && !msg.requestId) {',
      '        try { handler(msg.payload); } catch(err) {',
      '          console.error("[VSPen Bridge] Handler error:", err);',
      '        }',
      '      }',
      '    }',
      '  };',
      '',
      '  window.__VSPenBridge = VSPEN_BRIDGE;',
      '})();'
    ].join('\n');
  }

  /**
   * Inicializar el bridge en el sandbox después de cargar HTML
   */
  initializeSandbox() {
    const clientCode = this.generateBridgeClientCode();
    const initCall = `\nwindow.__VSPenBridge.init("${this._instanceId}");`;
    this._sandbox.executeScript(clientCode + initCall);
  }

  /**
   * Destruir bridge y limpiar listeners
   */
  destroy() {
    window.removeEventListener('message', this._boundOnMessage);

    // Limpiar pending requests
    for (const [id, pending] of this._pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Bridge destroyed'));
    }
    this._pendingRequests.clear();
    this._handlers.clear();
  }

  // === PRIVATE METHODS ===

  /**
   * @private
   */
  _onMessage(e) {
    const msg = e.data;

    // Validar estructura básica
    if (!msg || typeof msg !== 'object' || !msg.type) return;

    // Ignorar mensajes de otras fuentes
    if (msg.source !== 'vspen_sandbox') return;

    // Manejar respuestas a requests pendientes
    if (msg.type === '__response__' && msg.requestId !== null) {
      const pending = this._pendingRequests.get(msg.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this._pendingRequests.delete(msg.requestId);
        pending.resolve(msg.payload);
      }
      return;
    }

    // Manejar errores de requests pendientes
    if (msg.type === '__error__' && msg.requestId !== null) {
      const pending = this._pendingRequests.get(msg.requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this._pendingRequests.delete(msg.requestId);
        pending.reject(new Error(msg.payload?.message || 'Unknown bridge error'));
      }
      return;
    }

    // Bridge ready signal
    if (msg.type === '__bridge_ready__') {
      console.log('[PreviewBridge] Sandbox bridge initialized');
      this._eventBus.emit(VSPenConstants.EVENTS.PREVIEW_READY, {
        bridgeReady: true
      });
      return;
    }

    // Dispatch a handlers registrados
    const handler = this._handlers.get(msg.type);
    if (handler) {
      try {
        handler(msg.payload);
      } catch (err) {
        console.error(`[PreviewBridge] Error en handler "${msg.type}":`, err);
      }
    }

    // Emitir como evento genérico para observadores externos
    this._eventBus.emit(VSPenConstants.EVENTS.PREVIEW_MESSAGE, {
      type: msg.type,
      payload: msg.payload,
      timestamp: msg.timestamp
    });
  }

  /**
   * Registrar handlers internos del bridge
   * @private
   */
  _registerInternalHandlers() {
    // Escuchar errores de runtime del sandbox
    this.on('__runtime_error__', (payload) => {
      this._eventBus.emit(VSPenConstants.EVENTS.PREVIEW_ERROR, {
        error: payload?.message || 'Unknown runtime error',
        stack: payload?.stack,
        source: 'sandbox-runtime'
      });
    });

    // Escuchar console.log del sandbox
    this.on('__console__', (payload) => {
      const level = payload?.level || 'log';
      const args = payload?.args || [];

      if (console[level]) {
        console[level]('[Sandbox]', ...args);
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.VSPenPreviewBridge = PreviewBridge;
}