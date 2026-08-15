/**
 * ============================================
 * COMPILER SERVICE - Interfaz Abstracta
 * Orquestador principal de compilación con soporte multi-adapter
 * ============================================
 */

class CompilerService {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;

    /** @type {Map<string, Object>} Adapters registrados por nombre */
    this._adapters = new Map();

    /** @type {string|null} Adapter activo por defecto */
    this._defaultAdapter = null;

    /** @type {import('./cache-layer').CacheLayer|null} */
    this._cache = null;

    /** @type {import('./import-resolver').ImportResolver|null} */
    this._resolver = null;

    /** @type {import('./error-normalizer').ErrorNormalizer|null} */
    this._normalizer = null;

    /** @type {boolean} */
    this._isCompiling = false;
  }

  /**
   * Inyectar dependencias del compilador
   * @param {Object} deps
   * @param {import('./cache-layer').CacheLayer} deps.cache
   * @param {import('./import-resolver').ImportResolver} deps.resolver
   * @param {import('./error-normalizer').ErrorNormalizer} deps.normalizer
   */
  setDependencies(deps) {
    if (deps.cache) this._cache = deps.cache;
    if (deps.resolver) this._resolver = deps.resolver;
    if (deps.normalizer) this._normalizer = deps.normalizer;
  }

  /**
   * Registrar un adapter de compilación
   * @param {string} name - Nombre único (ej: "babel", "swc", "esbuild")
   * @param {Object} adapter - Debe implementar compile(code, options) → Promise<Result>
   * @param {boolean} [setDefault=false] - Marcar como adapter por defecto
   */
  registerAdapter(name, adapter, setDefault = false) {
    if (!adapter || typeof adapter.compile !== 'function') {
      throw new Error(`CompilerService.registerAdapter: "${name}" debe tener método compile()`);
    }

    this._adapters.set(name, adapter);

    if (setDefault || !this._defaultAdapter) {
      this._defaultAdapter = name;
    }

    console.log(`[CompilerService] Adapter "${name}" registrado${setDefault ? ' (default)' : ''}`);
  }

  /**
   * Compilar código usando el adapter especificado o el default
   * @param {string} code - Código fuente
   * @param {Object} [options]
   * @param {string} [options.adapter] - Nombre del adapter a usar
   * @param {string} [options.filename='app.tsx'] - Nombre de archivo para errores
   * @param {string} [options.language='tsx'] - Lenguaje fuente
   * @param {boolean} [options.useCache=true] - Usar cache si está disponible
   * @returns {Promise<CompileResult>}
   */
  async compile(code, options = {}) {
    const {
      adapter: adapterName = this._defaultAdapter,
      filename = 'app.tsx',
      language = 'tsx',
      useCache = true
    } = options;

    // Validar adapter
    const adapter = this._adapters.get(adapterName);
    if (!adapter) {
      const available = Array.from(this._adapters.keys()).join(', ');
      throw new Error(`CompilerService: Adapter "${adapterName}" no encontrado. Disponibles: ${available}`);
    }

    // Verificar cache
    if (useCache && this._cache) {
      const cached = this._cache.get(code, adapterName);
      if (cached) {
        this._eventBus.emit(VSPenConstants.EVENTS.COMPILE_CACHE_HIT, {
          adapter: adapterName,
          filename
        });
        return cached;
      }
    }

    // Emitir inicio de compilación
    this._isCompiling = true;
    this._eventBus.emit(VSPenConstants.EVENTS.COMPILE_STARTED, {
      adapter: adapterName,
      filename,
      language
    });

    try {
      // Resolver imports antes de compilar
      let resolvedCode = code;
      if (this._resolver) {
        resolvedCode = this._resolver.resolve(code, language);
      }

      // Ejecutar compilación
      const startTime = performance.now();
      const rawResult = await adapter.compile(resolvedCode, {
        filename,
        language,
        sourceMaps: false
      });
      const duration = Math.round(performance.now() - startTime);

      // Normalizar resultado
      const result = this._normalizeResult(rawResult, adapterName, filename, duration);

      // Guardar en cache
      if (useCache && this._cache && result.success) {
        this._cache.set(code, adapterName, result);
      }

      // Emitir éxito
      this._eventBus.emit(VSPenConstants.EVENTS.COMPILE_SUCCESS, {
        ...result,
        js: result.code,
        css: result.css || '',
        fullHTML: null // Se construye en preview module
      });

      return result;

    } catch (err) {
      // Normalizar error
      const normalizedError = this._normalizer
        ? this._normalizer.normalize(err, adapterName, filename)
        : { message: err.message, stack: err.stack, source: adapterName };

      // Emitir error
      this._eventBus.emit(VSPenConstants.EVENTS.COMPILE_ERROR, {
        error: normalizedError,
        filename,
        adapter: adapterName
      });

      return {
        success: false,
        code: null,
        css: null,
        errors: [normalizedError],
        warnings: [],
        duration: 0,
        adapter: adapterName,
        filename
      };

    } finally {
      this._isCompiling = false;
    }
  }

  /**
   * Verificar si se está compilando actualmente
   * @returns {boolean}
   */
  isCompiling() {
    return this._isCompiling;
  }

  /**
   * Obtener lista de adapters registrados
   * @returns {string[]}
   */
  getAdapters() {
    return Array.from(this._adapters.keys());
  }

  /**
   * Obtener adapter por defecto
   * @returns {string|null}
   */
  getDefaultAdapter() {
    return this._defaultAdapter;
  }

  /**
   * Cambiar adapter por defecto
   * @param {string} name
   */
  setDefaultAdapter(name) {
    if (!this._adapters.has(name)) {
      throw new Error(`CompilerService.setDefaultAdapter: "${name}" no registrado`);
    }
    this._defaultAdapter = name;
  }

  /**
   * Limpiar cache de compilación
   */
  clearCache() {
    if (this._cache) this._cache.clear();
  }

  /**
   * Obtener estadísticas
   * @returns {Object}
   */
  getStats() {
    return {
      isCompiling: this._isCompiling,
      defaultAdapter: this._defaultAdapter,
      registeredAdapters: this.getAdapters(),
      cacheSize: this._cache ? this._cache.size() : 0,
      cacheHitRate: this._cache ? this._cache.getHitRate() : 0
    };
  }

  // === PRIVATE METHODS ===

  /**
   * Normalizar resultado crudo del adapter
   * @private
   */
  _normalizeResult(rawResult, adapterName, filename, duration) {
    // Si el adapter ya retorna formato normalizado, usarlo directamente
    if (rawResult && typeof rawResult.success === 'boolean') {
      return {
        ...rawResult,
        adapter: adapterName,
        filename,
        duration
      };
    }

    // Convertir formato crudo Babel/otro a formato estándar
    return {
      success: true,
      code: rawResult?.code || rawResult || '',
      css: rawResult?.css || null,
      map: rawResult?.map || null,
      errors: [],
      warnings: rawResult?.warnings || [],
      duration,
      adapter: adapterName,
      filename
    };
  }
}

if (typeof window !== 'undefined') {
  window.VSPenCompilerService = CompilerService;
}