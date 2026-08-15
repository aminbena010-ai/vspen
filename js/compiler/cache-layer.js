/**
 * ============================================
 * CACHE LAYER - Memoización de Compilaciones
 * Cache LRU eficiente para evitar recompilaciones innecesarias
 * ============================================
 */

class CacheLayer {
  /**
   * @param {number} [maxSize=50] - Tamaño máximo del cache
   */
  constructor(maxSize) {
    this._maxSize = maxSize || VSPenConstants.COMPILER.CACHE_MAX_SIZE;

    /** @type {Map<string, {result: CompileResult, timestamp: number}>} */
    this._cache = new Map();

    /** @type {number} Total de consultas */
    this._totalHits = 0;
    this._totalMisses = 0;
  }

  /**
   * Obtener resultado compilado del cache
   * @param {string} code - Código fuente original
   * @param {string} adapter - Nombre del adapter
   * @returns {CompileResult|null} Resultado cacheado o null
   */
  get(code, adapter) {
    const key = this._buildKey(code, adapter);

    if (this._cache.has(key)) {
      this._totalHits++;

      // Mover al final (más recientemente usado)
      const entry = this._cache.get(key);
      this._cache.delete(key);
      this._cache.set(key, entry);

      return entry.result;
    }

    this._totalMisses++;
    return null;
  }

  /**
   * Guardar resultado en cache
   * @param {string} code - Código fuente original
   * @param {string} adapter - Nombre del adapter
   * @param {CompileResult} result - Resultado de compilación
   */
  set(code, adapter, result) {
    // Solo cachear compilaciones exitosas
    if (!result || !result.success) return;

    const key = this._buildKey(code, adapter);

    // Si ya existe, eliminar primero para reordenar
    if (this._cache.has(key)) {
      this._cache.delete(key);
    }

    // Evict LRU si estamos al límite
    while (this._cache.size >= this._maxSize) {
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
    }

    this._cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Verificar si existe en cache
   * @param {string} code
   * @param {string} adapter
   * @returns {boolean}
   */
  has(code, adapter) {
    return this._cache.has(this._buildKey(code, adapter));
  }

  /**
   * Eliminar entrada específica
   * @param {string} code
   * @param {string} adapter
   */
  delete(code, adapter) {
    this._cache.delete(this._buildKey(code, adapter));
  }

  /**
   * Limpiar todo el cache
   */
  clear() {
    this._cache.clear();
    this._totalHits = 0;
    this._totalMisses = 0;
  }

  /**
   * Obtener tamaño actual del cache
   * @returns {number}
   */
  size() {
    return this._cache.size;
  }

  /**
   * Obtener tasa de aciertos
   * @returns {number} Ratio 0-1
   */
  getHitRate() {
    const total = this._totalHits + this._totalMisses;
    if (total === 0) return 0;
    return this._totalHits / total;
  }

  /**
   * Obtener estadísticas detalladas
   * @returns {Object}
   */
  getStats() {
    return {
      size: this._cache.size,
      maxSize: this._maxSize,
      totalHits: this._totalHits,
      totalMisses: this._totalMisses,
      hitRate: this.getHitRate(),
      utilization: this._cache.size / this._maxSize
    };
  }

  /**
   * Eliminar entradas más antiguas que un timestamp
   * @param {number} maxAgeMs - Edad máxima en milisegundos
   * @returns {number} Cantidad eliminada
   */
  pruneOlderThan(maxAgeMs) {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;

    for (const [key, entry] of this._cache) {
      if (entry.timestamp < cutoff) {
        this._cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  // === PRIVATE METHODS ===

  /**
   * Construir clave de cache única
   * Usa hash rápido para evitar claves gigantes
   * @private
   */
  _buildKey(code, adapter) {
    const hash = this._fastHash(code);
    return `${adapter}:${hash}`;
  }

  /**
   * Hash rápido no criptográfico (djb2 variant)
   * Suficiente para detección de cambios en código fuente
   * @private
   */
  _fastHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
  }
}

if (typeof window !== 'undefined') {
  window.VSPenCacheLayer = CacheLayer;
}