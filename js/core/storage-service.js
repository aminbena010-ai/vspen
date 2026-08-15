/**
 * ============================================
 * STORAGE SERVICE - Abstracción localStorage
 * Con versionado, migración y serialización segura
 * ============================================
 */

class StorageService {
  /**
   * @param {import('./event-bus').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;
    this._prefix = VSPenConstants.STORAGE.PREFIX;
    this._currentVersion = VSPenConstants.APP.STORAGE_SCHEMA_VERSION;
    this._migrations = new Map();

    // Registrar migraciones futuras aquí
    // this._migrations.set(2, this._migrateV1toV2.bind(this));

    this._runMigrations();
  }

  /**
   * Obtener valor con deserialización segura
   * @param {string} key - Clave SIN prefijo
   * @param {*} defaultValue - Valor por defecto si no existe
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(this._prefix + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[StorageService] Error leyendo "${key}":`, err);
      return defaultValue;
    }
  }

  /**
   * Guardar valor con serialización segura
   * @param {string} key - Clave SIN prefijo
   * @param {*} value - Valor a guardar (debe ser JSON-serializable)
   * @returns {boolean} true si se guardó correctamente
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this._prefix + key, serialized);
      return true;
    } catch (err) {
      console.error(`[StorageService] Error escribiendo "${key}":`, err);

      // Si es QuotaExceededError, intentar limpiar caché
      if (err.name === 'QuotaExceededError') {
        console.warn('[StorageService] Storage lleno, intentando limpieza...');
        this._emergencyCleanup();
        try {
          localStorage.setItem(this._prefix + key, JSON.stringify(value));
          return true;
        } catch {
          console.error('[StorageService] Limpieza insuficiente, no se pudo guardar');
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Eliminar clave
   * @param {string} key - Clave SIN prefijo
   */
  remove(key) {
    try {
      localStorage.removeItem(this._prefix + key);
    } catch (err) {
      console.warn(`[StorageService] Error eliminando "${key}":`, err);
    }
  }

  /**
   * Verificar si existe una clave
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return localStorage.getItem(this._prefix + key) !== null;
  }

  /**
   * Obtener todas las claves de VSPen
   * @returns {string[]} Claves SIN prefijo
   */
  keys() {
    const result = [];
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(this._prefix)) {
        result.push(fullKey.substring(this._prefix.length));
      }
    }
    return result;
  }

  /**
   * Limpiar TODOS los datos de VSPen
   */
  clearAll() {
    const keys = this.keys();
    for (const key of keys) {
      this.remove(key);
    }
  }

  /**
   * Obtener tamaño usado por VSPen (aproximado en bytes)
   * @returns {number}
   */
  getSizeBytes() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this._prefix)) {
        total += key.length + (localStorage.getItem(key) || '').length;
      }
    }
    return total * 2; // UTF-16 ≈ 2 bytes por char
  }

  /**
   * Exportar todos los datos como objeto plano
   * @returns {Object}
   */
  exportAll() {
    const data = {};
    for (const key of this.keys()) {
      data[key] = this.get(key);
    }
    return data;
  }

  /**
   * Importar datos desde objeto plano
   * @param {Object} data
   */
  importAll(data) {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }

  // === MIGRATIONS ===

  _runMigrations() {
    const storedVersion = this.get(VSPenConstants.STORAGE.VERSION, 0);

    if (storedVersion >= this._currentVersion) return;

    console.log(`[StorageService] Migrando de v${storedVersion} a v${this._currentVersion}`);

    for (let v = storedVersion + 1; v <= this._currentVersion; v++) {
      const migration = this._migrations.get(v);
      if (migration) {
        try {
          migration();
          console.log(`[StorageService] Migración v${v} completada`);
        } catch (err) {
          console.error(`[StorageService] Error en migración v${v}:`, err);
        }
      }
    }

    this.set(VSPenConstants.STORAGE.VERSION, this._currentVersion);
    this._eventBus.emit(VSPenConstants.EVENTS.STORAGE_MIGRATED, {
      from: storedVersion,
      to: this._currentVersion
    });
  }

  _emergencyCleanup() {
    // Eliminar datos no críticos cuando el storage está lleno
    const nonCriticalKeys = [
      VSPenConstants.STORAGE.COMMAND_HISTORY,
      VSPenConstants.STORAGE.RECENT_FILES
    ];
    for (const key of nonCriticalKeys) {
      this.remove(key);
    }
  }
}

if (typeof window !== 'undefined') {
  window.VSPenStorageService = StorageService;
}