/**
 * ============================================
 * IMPORT RESOLVER - Bare Imports → ESM CDN URLs
 * Transforma imports npm a URLs de esm.sh/skypack
 * ============================================
 */

class ImportResolver {
  constructor() {
    /** @type {string} CDN base URL */
    this._cdnBase = VSPenConstants.COMPILER.ESM_CDN_BASE;

    /** @type {Map<string, string>} Mapeo manual de paquetes → URLs */
    this._customMappings = new Map();

    /** @type {Map<string, string>} Cache de resoluciones previas */
    this._resolutionCache = new Map();

    /** @type {Set<string>} Paquetes que NO deben resolverse (built-ins) */
    this._builtins = new Set([
      'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'
    ]);

    // Regex para detectar import statements
    this._importRegex = /(?:import|export)\s+(?:(?:[\w*{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g;
    this._dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    this._requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  }

  /**
   * Resolver todos los imports en el código
   * @param {string} code - Código fuente
   * @param {string} [language='tsx'] - Lenguaje (para decidir estrategia)
   * @returns {string} Código con imports resueltos
   */
  resolve(code, language = 'tsx') {
    if (!code) return code;

    let resolved = code;

    // Resolver static imports
    resolved = resolved.replace(this._importRegex, (match, specifier) => {
      const url = this._resolveSpecifier(specifier);
      return match.replace(specifier, url);
    });

    // Resolver dynamic imports
    resolved = resolved.replace(this._dynamicImportRegex, (match, specifier) => {
      const url = this._resolveSpecifier(specifier);
      return match.replace(specifier, url);
    });

    // Resolver require() (transformar a import dinámico)
    resolved = resolved.replace(this._requireRegex, (match, specifier) => {
      const url = this._resolveSpecifier(specifier);
      return `import("${url}")`;
    });

    return resolved;
  }

  /**
   * Resolver un specifier individual
   * @param {string} specifier - Ej: "lodash", "react", "./utils", "@scope/pkg"
   * @returns {string} URL resuelta o specifier original
   */
  resolveSpecifier(specifier) {
    return this._resolveSpecifier(specifier);
  }

  /**
   * Añadir mapeo personalizado
   * @param {string} packageName - Nombre del paquete
   * @param {string} url - URL completa
   */
  addMapping(packageName, url) {
    this._customMappings.set(packageName, url);
    this._resolutionCache.delete(packageName); // Invalidar cache
  }

  /**
   * Remover mapeo personalizado
   * @param {string} packageName
   */
  removeMapping(packageName) {
    this._customMappings.delete(packageName);
    this._resolutionCache.delete(packageName);
  }

  /**
   * Establecer CDN base
   * @param {string} baseUrl - Ej: "https://esm.sh", "https://cdn.skypack.dev"
   */
  setCdnBase(baseUrl) {
    this._cdnBase = baseUrl.replace(/\/+$/, '');
    this._resolutionCache.clear(); // Invalidar todo el cache
  }

  /**
   * Obtener CDN base actual
   * @returns {string}
   */
  getCdnBase() {
    return this._cdnBase;
  }

  /**
   * Limpiar cache de resoluciones
   */
  clearCache() {
    this._resolutionCache.clear();
  }

  /**
   * Obtener estadísticas
   * @returns {Object}
   */
  getStats() {
    return {
      cdnBase: this._cdnBase,
      customMappings: this._customMappings.size,
      cachedResolutions: this._resolutionCache.size,
      builtins: Array.from(this._builtins)
    };
  }

  // === PRIVATE METHODS ===

  /**
   * Resolver specifier interno con cache
   * @private
   */
  _resolveSpecifier(specifier) {
    // 1. Imports relativos → no resolver
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      return specifier;
    }

    // 2. Ya es URL absoluta → no resolver
    if (specifier.startsWith('http://') || specifier.startsWith('https://')) {
      return specifier;
    }

    // 3. Verificar cache
    if (this._resolutionCache.has(specifier)) {
      return this._resolutionCache.get(specifier);
    }

    // 4. Verificar mapeos personalizados
    if (this._customMappings.has(specifier)) {
      const url = this._customMappings.get(specifier);
      this._resolutionCache.set(specifier, url);
      return url;
    }

    // 5. Construir URL del CDN
    const url = this._buildCdnUrl(specifier);
    this._resolutionCache.set(specifier, url);
    return url;
  }

  /**
   * Construir URL del CDN para un paquete
   * @private
   */
  _buildCdnUrl(specifier) {
    // Parsear scope y subpath: @scope/pkg/subpath → scope=@scope/pkg, subpath=/subpath
    let packageName = specifier;
    let subpath = '';

    if (specifier.startsWith('@')) {
      // Scoped package: @scope/name or @scope/name/subpath
      const parts = specifier.split('/');
      packageName = parts.slice(0, 2).join('/');
      subpath = parts.length > 2 ? '/' + parts.slice(2).join('/') : '';
    } else {
      // Regular package: name or name/subpath
      const slashIndex = specifier.indexOf('/');
      if (slashIndex !== -1) {
        packageName = specifier.substring(0, slashIndex);
        subpath = specifier.substring(slashIndex);
      }
    }

    // Construir URL según CDN
    const cdnBase = this._cdnBase;

    if (cdnBase.includes('esm.sh')) {
      // esm.sh format: https://esm.sh/package@version/subpath
      return `${cdnBase}/${packageName}${subpath}`;
    } else if (cdnBase.includes('skypack')) {
      // Skypack format: https://cdn.skypack.dev/package/subpath
      return `${cdnBase}/${packageName}${subpath}`;
    } else if (cdnBase.includes('unpkg')) {
      // unpkg format: https://unpkg.com/package/subpath?module
      return `${cdnBase}/${packageName}${subpath}?module`;
    } else {
      // Generic fallback
      return `${cdnBase}/${packageName}${subpath}`;
    }
  }
}

if (typeof window !== 'undefined') {
  window.VSPenImportResolver = ImportResolver;
}