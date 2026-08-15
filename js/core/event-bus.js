/**
 * ============================================
 * EVENT BUS - Pub/Sub Desacoplado
 * Comunicación entre módulos sin dependencias directas
 * ============================================
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
    /** @type {Array<{event: string, data: any, timestamp: number}>} */
    this._history = [];
    this._maxHistory = 100;
    this._debugMode = false;
  }

  /**
   * Suscribirse a un evento
   * @param {string} event - Nombre del evento (usar VSPenConstants.EVENTS)
   * @param {Function} callback - Función a ejecutar
   * @returns {Function} Función de desuscripción
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError(`EventBus.on: callback debe ser función, recibido ${typeof callback}`);
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    this._listeners.get(event).add(callback);

    if (this._debugMode) {
      console.log(`[EventBus] Subscrito a "${event}"`);
    }

    // Retornar función de cleanup
    return () => this.off(event, callback);
  }

  /**
   * Suscribirse a un evento (solo se ejecuta una vez)
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Función de desuscripción
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback.apply(null, args);
    };
    return this.on(event, wrapper);
  }

  /**
   * Desuscribirse de un evento
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Emitir un evento
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos a pasar a los listeners
   */
  emit(event, data) {
    // Registrar en historial
    this._history.push({
      event,
      data,
      timestamp: Date.now()
    });

    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    if (this._debugMode) {
      console.log(`[EventBus] Emitido "${event}"`, data);
    }

    const listeners = this._listeners.get(event);
    if (!listeners || listeners.size === 0) return;

    // Ejecutar cada listener en try/catch individual
    // Un listener roto NO rompe a los demás
    for (const callback of listeners) {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error en listener de "${event}":`, err);
      }
    }
  }

  /**
   * Obtener historial de eventos (para debugging)
   * @param {number} limit - Máximo de entradas a retornar
   * @returns {Array}
   */
  getHistory(limit = 20) {
    return this._history.slice(-limit);
  }

  /**
   * Activar/desactivar modo debug
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this._debugMode = Boolean(enabled);
  }

  /**
   * Eliminar todos los listeners de un evento o todos los eventos
   * @param {string} [event] - Si no se pasa, limpia todo
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
      this._history = [];
    }
  }

  /**
   * Obtener cantidad de listeners para un evento
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.size : 0;
  }
}

// Singleton instance
const eventBus = new EventBus();

if (typeof window !== 'undefined') {
  window.VSPenEventBus = eventBus;
}