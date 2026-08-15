/**
 * ============================================
 * BABEL ADAPTER - Implementación Babel Standalone
 * Compilación TSX/JSX → JS usando Babel en el navegador
 * ============================================
 */

class BabelAdapter {
  constructor() {
    /** @type {boolean} */
    this._isLoaded = false;

    /** @type {Object} Configuración de presets */
    this._config = {
      presets: [
        ['react', { runtime: 'automatic' }],
        ['typescript', { isTSX: true, allExtensions: true }]
      ],
      plugins: [],
      babelrc: false,
      comments: false,
      compact: false
    };

    // Verificar si Babel ya está cargado
    this._checkAvailability();
  }

  /**
   * Compilar código usando Babel Standalone
   * @param {string} code - Código fuente TSX/JSX
   * @param {Object} [options]
   * @param {string} [options.filename='app.tsx']
   * @param {string} [options.language='tsx']
   * @returns {Promise<CompileResult>}
   */
  async compile(code, options = {}) {
    const { filename = 'app.tsx', language = 'tsx' } = options;

    // Esperar a que Babel esté disponible
    await this._ensureLoaded();

    // Ajustar config según lenguaje
    const config = this._getConfigForLanguage(language);

    try {
      const result = Babel.transform(code, {
        ...config,
        filename
      });

      return {
        success: true,
        code: result.code,
        css: null,
        map: result.map || null,
        errors: [],
        warnings: this._extractWarnings(result),
        adapter: 'babel'
      };

    } catch (err) {
      // Babel lanza errores con ubicación precisa
      return {
        success: false,
        code: null,
        css: null,
        errors: [{
          message: err.message,
          line: err.loc?.line || null,
          column: err.loc?.column || null,
          source: 'babel',
          filename
        }],
        warnings: [],
        adapter: 'babel'
      };
    }
  }

  /**
   * Verificar si Babel está disponible
   * @returns {boolean}
   */
  isAvailable() {
    return typeof Babel !== 'undefined' && typeof Babel.transform === 'function';
  }

  /**
   * Obtener nombre del adapter
   * @returns {string}
   */
  getName() {
    return 'babel';
  }

  /**
   * Obtener lenguajes soportados
   * @returns {string[]}
   */
  getSupportedLanguages() {
    return ['typescript', 'tsx', 'javascript', 'jsx', 'ts', 'js'];
  }

  /**
   * Actualizar configuración de Babel
   * @param {Object} overrides - Presets/plugins adicionales
   */
  updateConfig(overrides) {
    if (overrides.presets) {
      this._config.presets = overrides.presets;
    }
    if (overrides.plugins) {
      this._config.plugins = overrides.plugins;
    }
  }

  // === PRIVATE METHODS ===

  /**
   * Verificar disponibilidad de Babel
   * @private
   */
  _checkAvailability() {
    this._isLoaded = this.isAvailable();
    if (this._isLoaded) {
      console.log('[BabelAdapter] Babel Standalone detectado');
    } else {
      console.warn('[BabelAdapter] Babel Standalone no encontrado. Esperando carga...');
    }
  }

  /**
   * Esperar a que Babel esté cargado (polling con timeout)
   * @private
   * @returns {Promise<void>}
   */
  _ensureLoaded() {
    if (this._isLoaded) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const maxAttempts = 50; // 5 segundos
      let attempts = 0;

      const check = () => {
        attempts++;
        if (this.isAvailable()) {
          this._isLoaded = true;
          console.log('[BabelAdapter] Babel Standalone cargado correctamente');
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Babel Standalone no se cargó después de 5s. Verifica la conexión CDN.'));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  }

  /**
   * Obtener configuración específica por lenguaje
   * @private
   */
  _getConfigForLanguage(language) {
    const lang = language.toLowerCase();

    switch (lang) {
      case 'typescript':
      case 'ts':
        return {
          ...this._config,
          presets: [['typescript', { isTSX: false, allExtensions: true }]]
        };

      case 'tsx':
        return {
          ...this._config,
          presets: [
            ['react', { runtime: 'automatic' }],
            ['typescript', { isTSX: true, allExtensions: true }]
          ]
        };

      case 'jsx':
      case 'javascript':
      case 'js':
        return {
          ...this._config,
          presets: [['react', { runtime: 'automatic' }]]
        };

      default:
        return this._config;
    }
  }

  /**
   * Extraer warnings del resultado de Babel
   * @private
   */
  _extractWarnings(result) {
    const warnings = [];

    if (result.warnings && Array.isArray(result.warnings)) {
      for (const warn of result.warnings) {
        warnings.push({
          message: typeof warn === 'string' ? warn : warn.message,
          line: warn.loc?.line || null,
          column: warn.loc?.column || null,
          source: 'babel'
        });
      }
    }

    return warnings;
  }
}

if (typeof window !== 'undefined') {
  window.VSPenBabelAdapter = BabelAdapter;
}