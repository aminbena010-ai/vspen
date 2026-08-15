/**
 * ============================================
 * FS WATCHERS - Notificaciones vía EventBus
 * Sistema de observadores reactivos para cambios en el VFS
 * ============================================
 */

class FileSystemWatcher {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;

    /** @type {Map<string, Set<{pattern: string|RegExp, callback: Function, unsubscribe: Function}>>} */
    this._watchers = new Map();

    // Registrar listeners internos del EventBus
    this._setupInternalListeners();
  }

  /**
   * Observar cambios en una ruta específica o patrón
   * @param {string|RegExp} pattern - Ruta exacta ("/src/app.tsx") o regex (/\.tsx$/)
   * @param {Function} callback - Se llama con {event, path, data}
   * @param {Object} [options]
   * @param {string[]} [options.events] - Eventos específicos a observar (default: todos)
   * @param {boolean} [options.recursive=false] - Si es carpeta, observar hijos recursivamente
   * @returns {Function} Función de desuscripción
   */
  watch(pattern, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('FileSystemWatcher.watch: callback debe ser función');
    }

    const { events = null, recursive = false } = options;
    const id = this._generateId();

    const watcherEntry = {
      id,
      pattern,
      callback,
      events: events ? new Set(events) : null,
      recursive: Boolean(recursive),
      isRegex: pattern instanceof RegExp
    };

    // Almacenar watcher
    if (!this._watchers.has(id)) {
      this._watchers.set(id, watcherEntry);
    }

    // Retornar función de cleanup
    return () => {
      this._watchers.delete(id);
    };
  }

  /**
   * Observar un archivo específico (shortcut)
   * @param {string} path - Ruta exacta
   * @param {Function} callback
   * @returns {Function} Unsubscribe
   */
  watchFile(path, callback) {
    return this.watch(path, callback, {
      events: [
        VSPenConstants.EVENTS.FILE_UPDATED,
        VSPenConstants.EVENTS.FILE_DELETED,
        VSPenConstants.EVENTS.FILE_RENAMED
      ]
    });
  }

  /**
   * Observar un directorio y sus cambios directos
   * @param {string} path - Ruta del directorio
   * @param {Function} callback
   * @param {boolean} [recursive=false]
   * @returns {Function} Unsubscribe
   */
  watchDirectory(path, callback, recursive = false) {
    return this.watch(path, callback, {
      events: [
        VSPenConstants.EVENTS.FILE_CREATED,
        VSPenConstants.EVENTS.FILE_DELETED,
        VSPenConstants.EVENTS.FILE_RENAMED,
        VSPenConstants.EVENTS.DIRECTORY_CREATED,
        VSPenConstants.EVENTS.DIRECTORY_DELETED
      ],
      recursive
    });
  }

  /**
   * Observar todos los archivos de un tipo específico
   * @param {string} extension - Ej: ".tsx", ".css"
   * @param {Function} callback
   * @returns {Function} Unsubscribe
   */
  watchByExtension(extension, callback) {
    const escapedExt = extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedExt + '$');
    return this.watch(regex, callback);
  }

  /**
   * Obtener cantidad de watchers activos
   * @returns {number}
   */
  getWatcherCount() {
    return this._watchers.size;
  }

  /**
   * Eliminar todos los watchers
   */
  clearAll() {
    this._watchers.clear();
  }

  // === PRIVATE METHODS ===

  /**
   * Configurar listeners internos que disparan los watchers
   * @private
   */
  _setupInternalListeners() {
    const fsEvents = [
      VSPenConstants.EVENTS.FILE_CREATED,
      VSPenConstants.EVENTS.FILE_UPDATED,
      VSPenConstants.EVENTS.FILE_DELETED,
      VSPenConstants.EVENTS.FILE_RENAMED,
      VSPenConstants.EVENTS.FILE_OPENED,
      VSPenConstants.EVENTS.FILE_SAVED,
      VSPenConstants.EVENTS.DIRECTORY_CREATED,
      VSPenConstants.EVENTS.DIRECTORY_DELETED
    ];

    for (const eventName of fsEvents) {
      this._eventBus.on(eventName, (data) => {
        this._notifyWatchers(eventName, data);
      });
    }
  }

  /**
   * Notificar a todos los watchers que coinciden
   * @private
   */
  _notifyWatchers(event, data) {
    const path = data.path || data.newPath || '';

    for (const watcher of this._watchers.values()) {
      // Filtrar por evento si se especificaron eventos concretos
      if (watcher.events && !watcher.events.has(event)) continue;

      // Verificar si el patrón coincide
      if (!this._matchesPattern(watcher, path)) continue;

      // Ejecutar callback en try/catch individual
      try {
        watcher.callback({
          event,
          path,
          data
        });
      } catch (err) {
        console.error(`[FSWatcher] Error en watcher para "${path}":`, err);
      }
    }
  }

  /**
   * Verificar si un path coincide con el patrón del watcher
   * @private
   */
  _matchesPattern(watcher, path) {
    if (watcher.isRegex) {
      return watcher.pattern.test(path);
    }

    // Patrón string: match exacto o prefijo (para directorios)
    if (path === watcher.pattern) return true;

    // Match recursivo: el path empieza con el patrón + "/"
    if (watcher.recursive && path.startsWith(watcher.pattern + '/')) {
      return true;
    }

    // Match directo de directorio: path es hijo inmediato
    if (!watcher.recursive) {
      const parentDir = path.substring(0, path.lastIndexOf('/'));
      if (parentDir === watcher.pattern) return true;
    }

    return false;
  }

  /**
   * Generar ID único para watcher
   * @private
   */
  _generateId() {
    return 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }
}

if (typeof window !== 'undefined') {
  window.VSPenFileSystemWatcher = FileSystemWatcher;
}