/**
 * ============================================
 * SERVICE REGISTRY - Contenedor DI + Lazy Init
 * Gestión centralizada de servicios con inyección de dependencias
 * ============================================
 */

class ServiceRegistry {
  constructor() {
    /** @type {Map<string, {factory: Function, instance: any, singleton: boolean, deps: string[]}>} */
    this._services = new Map();
    /** @type {Set<string>} Servicios actualmente inicializando (detección de ciclos) */
    this._initializing = new Set();
    this._debugMode = false;
  }

  /**
   * Registrar un servicio
   * @param {string} name - Nombre único del servicio
   * @param {Function} factory - Función que crea la instancia
   * @param {Object} [options]
   * @param {boolean} [options.singleton=true] - Si es singleton o transiente
   * @param {string[]} [options.deps=[]] - Nombres de dependencias a inyectar
   */
  register(name, factory, options = {}) {
    if (typeof factory !== 'function') {
      throw new TypeError(`ServiceRegistry.register: factory debe ser función para "${name}"`);
    }

    const { singleton = true, deps = [] } = options;

    this._services.set(name, {
      factory,
      instance: null,
      singleton: Boolean(singleton),
      deps: Array.isArray(deps) ? deps : []
    });

    if (this._debugMode) {
      console.log(`[ServiceRegistry] Registrado "${name}" (singleton=${singleton}, deps=[${deps.join(', ')}])`);
    }
  }

  /**
   * Obtener una instancia del servicio (lazy initialization)
   * @param {string} name
   * @returns {*} Instancia del servicio
   */
  get(name) {
    const entry = this._services.get(name);

    if (!entry) {
      throw new Error(`ServiceRegistry.get: Servicio "${name}" no registrado`);
    }

    // Singleton ya instanciado → retornar cache
    if (entry.singleton && entry.instance !== null) {
      return entry.instance;
    }

    // Detección de dependencia circular
    if (this._initializing.has(name)) {
      throw new Error(`ServiceRegistry.get: Dependencia circular detectada en "${name}"`);
    }

    // Resolver dependencias recursivamente
    this._initializing.add(name);

    try {
      const resolvedDeps = entry.deps.map(depName => this.get(depName));
      const instance = entry.factory(...resolvedDeps);

      if (entry.singleton) {
        entry.instance = instance;
      }

      if (this._debugMode) {
        console.log(`[ServiceRegistry] Instanciado "${name}"`);
      }

      return instance;
    } finally {
      this._initializing.delete(name);
    }
  }

  /**
   * Verificar si un servicio está registrado
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._services.has(name);
  }

  /**
   * Obtener servicio solo si existe (sin lanzar error)
   * @param {string} name
   * @returns {*|null}
   */
  tryGet(name) {
    try {
      return this.get(name);
    } catch {
      return null;
    }
  }

  /**
   * Reemplazar instancia de un singleton (útil para testing/mocks)
   * @param {string} name
   * @param {*} instance
   */
  override(name, instance) {
    const entry = this._services.get(name);
    if (!entry) {
      throw new Error(`ServiceRegistry.override: Servicio "${name}" no registrado`);
    }
    if (!entry.singleton) {
      throw new Error(`ServiceRegistry.override: Solo se pueden reemplazar singletons`);
    }
    entry.instance = instance;
  }

  /**
   * Resetear un singleton (forzar re-instanciación en próximo get)
   * @param {string} name
   */
  reset(name) {
    const entry = this._services.get(name);
    if (entry && entry.singleton) {
      entry.instance = null;
    }
  }

  /**
   * Listar todos los servicios registrados
   * @returns {Array<{name: string, singleton: boolean, instantiated: boolean, deps: string[]}>}
   */
  list() {
    const result = [];
    for (const [name, entry] of this._services) {
      result.push({
        name,
        singleton: entry.singleton,
        instantiated: entry.singleton && entry.instance !== null,
        deps: [...entry.deps]
      });
    }
    return result;
  }

  /**
   * Activar/desactivar modo debug
   * @param {boolean} enabled
   */
  setDebug(enabled) {
    this._debugMode = Boolean(enabled);
  }
}

// Singleton instance
const serviceRegistry = new ServiceRegistry();

if (typeof window !== 'undefined') {
  window.VSPenServiceRegistry = serviceRegistry;
}