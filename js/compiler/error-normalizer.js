/**
 * ============================================
 * ERROR NORMALIZER - Formato Uniforme Multi-Compilador
 * Convierte errores de cualquier adapter a formato estándar
 * ============================================
 */

class ErrorNormalizer {
  constructor() {
    /** @type {Map<string, Function>} Normalizadores específicos por adapter */
    this._adapterNormalizers = new Map();

    // Registrar normalizadores conocidos
    this._registerBuiltinNormalizers();
  }

  /**
   * Normalizar un error crudo a formato estándar
   * @param {*} error - Error crudo del adapter
   * @param {string} adapter - Nombre del adapter que lo generó
   * @param {string} [filename='unknown'] - Archivo origen
   * @returns {NormalizedError}
   */
  normalize(error, adapter, filename = 'unknown') {
    // Intentar normalizador específico del adapter
    const adapterNormalizer = this._adapterNormalizers.get(adapter);
    if (adapterNormalizer) {
      try {
        const normalized = adapterNormalizer(error, filename);
        if (normalized) return normalized;
      } catch (err) {
        console.warn(`[ErrorNormalizer] Falló normalizador de "${adapter}":`, err);
      }
    }

    // Fallback: normalización genérica
    return this._normalizeGeneric(error, adapter, filename);
  }

  /**
   * Normalizar array de errores
   * @param {Array} errors
   * @param {string} adapter
   * @param {string} [filename]
   * @returns {NormalizedError[]}
   */
  normalizeAll(errors, adapter, filename) {
    if (!Array.isArray(errors)) return [this.normalize(errors, adapter, filename)];
    return errors.map(err => this.normalize(err, adapter, filename));
  }

  /**
   * Registrar normalizador personalizado para un adapter
   * @param {string} adapterName
   * @param {Function} normalizer - (error, filename) → NormalizedError
   */
  registerNormalizer(adapterName, normalizer) {
    if (typeof normalizer !== 'function') {
      throw new TypeError('ErrorNormalizer.registerNormalizer: normalizer debe ser función');
    }
    this._adapterNormalizers.set(adapterName, normalizer);
  }

  /**
   * Formatear error para display en UI
   * @param {NormalizedError} error
   * @returns {string}
   */
  formatForDisplay(error) {
    const parts = [];

    if (error.filename) {
      parts.push(error.filename);
    }

    if (error.line !== null && error.line !== undefined) {
      parts.push(`:${error.line}`);
      if (error.column !== null && error.column !== undefined) {
        parts.push(`:${error.column}`);
      }
    }

    const location = parts.join('');
    const prefix = location ? `${location} - ` : '';

    return `${prefix}${error.message}`;
  }

  /**
   * Formatear error como objeto serializable
   * @param {NormalizedError} error
   * @returns {Object}
   */
  toSerializable(error) {
    return {
      message: error.message,
      line: error.line,
      column: error.column,
      severity: error.severity,
      source: error.source,
      filename: error.filename,
      code: error.code,
      suggestion: error.suggestion
    };
  }

  // === PRIVATE METHODS ===

  /**
   * Registrar normalizadores built-in
   * @private
   */
  _registerBuiltinNormalizers() {
    // Babel errors
    this._adapterNormalizers.set('babel', (error, filename) => {
      return {
        message: error.message || 'Unknown Babel error',
        line: error.loc?.line || null,
        column: error.loc?.column || null,
        severity: 'error',
        source: 'babel',
        filename: filename || error.filename || null,
        code: error.code || null,
        stack: error.stack || null,
        suggestion: null
      };
    });

    // SWC errors (futuro)
    this._adapterNormalizers.set('swc', (error, filename) => {
      return {
        message: error.message || 'Unknown SWC error',
        line: error.span?.start?.line || null,
        column: error.span?.start?.col || null,
        severity: error.level === 'warning' ? 'warning' : 'error',
        source: 'swc',
        filename: filename || null,
        code: error.code || null,
        stack: null,
        suggestion: error.suggestion || null
      };
    });

    // esbuild errors (futuro)
    this._adapterNormalizers.set('esbuild', (error, filename) => {
      return {
        message: error.text || error.message || 'Unknown esbuild error',
        line: error.location?.line || null,
        column: error.location?.column || null,
        severity: error.kind === 'warning' ? 'warning' : 'error',
        source: 'esbuild',
        filename: filename || error.location?.file || null,
        code: null,
        stack: null,
        suggestion: error.notes?.[0]?.text || null
      };
    });
  }

  /**
   * Normalización genérica fallback
   * @private
   */
  _normalizeGeneric(error, adapter, filename) {
    // Si ya tiene formato normalizado, retornar tal cual
    if (error && typeof error.message === 'string' && 'severity' in error) {
      return error;
    }

    // String error
    if (typeof error === 'string') {
      return {
        message: error,
        line: null,
        column: null,
        severity: 'error',
        source: adapter,
        filename,
        code: null,
        stack: null,
        suggestion: null
      };
    }

    // Error object estándar
    if (error instanceof Error) {
      // Intentar extraer línea/columna del mensaje
      const lineMatch = error.message.match(/(?:line|Ln)\s*(\d+)/i);
      const colMatch = error.message.match(/(?:col|column)\s*(\d+)/i);

      return {
        message: error.message,
        line: lineMatch ? parseInt(lineMatch[1], 10) : null,
        column: colMatch ? parseInt(colMatch[1], 10) : null,
        severity: 'error',
        source: adapter,
        filename,
        code: null,
        stack: error.stack || null,
        suggestion: null
      };
    }

    // Objeto genérico con message
    if (error && typeof error === 'object' && error.message) {
      return {
        message: String(error.message),
        line: error.line || error.loc?.line || null,
        column: error.column || error.loc?.column || null,
        severity: error.severity || error.level || 'error',
        source: adapter,
        filename: filename || error.filename || null,
        code: error.code || null,
        stack: error.stack || null,
        suggestion: error.suggestion || null
      };
    }

    // Último recurso
    return {
      message: String(error),
      line: null,
      column: null,
      severity: 'error',
      source: adapter,
      filename,
      code: null,
      stack: null,
      suggestion: null
    };
  }
}

/**
 * @typedef {Object} NormalizedError
 * @property {string} message - Mensaje de error legible
 * @property {number|null} line - Línea del error (1-based)
 * @property {number|null} column - Columna del error (0-based)
 * @property {'error'|'warning'|'info'} severity - Severidad
 * @property {string} source - Adapter que generó el error
 * @property {string|null} filename - Archivo donde ocurrió
 * @property {string|null} code - Código de error específico del adapter
 * @property {string|null} stack - Stack trace si disponible
 * @property {string|null} suggestion - Sugerencia de corrección si disponible
 */

if (typeof window !== 'undefined') {
  window.VSPenErrorNormalizer = ErrorNormalizer;
}