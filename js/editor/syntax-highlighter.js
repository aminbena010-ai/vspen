/**
 * ============================================
 * SYNTAX HIGHLIGHTER - Tokenizer Regex Extensible
 * Resaltado de sintaxis basado en reglas por lenguaje
 * ============================================
 */

class SyntaxHighlighter {
  constructor() {
    /** @type {Map<string, Array<{pattern: RegExp, className: string}>>} */
    this._rules = new Map();

    /** @type {Map<string, Function>} Preprocesadores por lenguaje */
    this._preprocessors = new Map();

    // Registrar lenguajes por defecto
    this._registerDefaultLanguages();
  }

  /**
   * Resaltar código según lenguaje
   * @param {string} code - Código fuente
   * @param {string} language - Identificador del lenguaje
   * @returns {string} HTML con spans de resaltado
   */
  highlight(code, language) {
    if (!code) return '';

    const lang = language.toLowerCase();
    const rules = this._rules.get(lang);

    if (!rules || rules.length === 0) {
      return this._escapeHtml(code);
    }

    // Preprocesar si existe
    let processed = code;
    const preprocessor = this._preprocessors.get(lang);
    if (preprocessor) {
      processed = preprocessor(code);
    }

    return this._tokenize(processed, rules);
  }

  /**
   * Registrar reglas para un lenguaje
   * @param {string} language - Identificador
   * @param {Array<{pattern: RegExp, className: string}>} rules
   * @param {Function} [preprocessor] - Transformación previa opcional
   */
  registerLanguage(language, rules, preprocessor) {
    const lang = language.toLowerCase();
    this._rules.set(lang, rules);
    if (preprocessor) {
      this._preprocessors.set(lang, preprocessor);
    }
  }

  /**
   * Verificar si un lenguaje está registrado
   * @param {string} language
   * @returns {boolean}
   */
  hasLanguage(language) {
    return this._rules.has(language.toLowerCase());
  }

  /**
   * Obtener lista de lenguajes registrados
   * @returns {string[]}
   */
  getLanguages() {
    return Array.from(this._rules.keys());
  }

  // === PRIVATE METHODS ===

  /**
   * Tokenizar código aplicando reglas en orden de prioridad
   * Usa marcadores temporales para evitar solapamientos
   * @private
   */
  _tokenize(code, rules) {
    // Escapar HTML primero
    let result = this._escapeHtml(code);

    // Marcadores únicos para proteger tokens ya procesados
    const markers = [];
    let markerIndex = 0;

    for (const rule of rules) {
      const placeholder = `\x00MARKER${markerIndex++}\x00`;

      result = result.replace(rule.pattern, (...args) => {
        const match = args[0];
        const span = `<span class="${rule.className}">${match}</span>`;
        markers.push(span);
        return placeholder;
      });
    }

    // Restaurar marcadores en orden inverso
    for (let i = markers.length - 1; i >= 0; i--) {
      result = result.replace(`\x00MARKER${i}\x00`, markers[i]);
    }

    return result;
  }

  /**
   * Escapar caracteres HTML especiales
   * @private
   */
  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Registrar lenguajes por defecto
   * @private
   */
  _registerDefaultLanguages() {
    // Los lenguajes se registran desde archivos separados en languages/
    // Este método sirve como punto de extensión
    if (typeof window !== 'undefined' && window.VSPenLanguages) {
      for (const [lang, config] of Object.entries(window.VSPenLanguages)) {
        this.registerLanguage(lang, config.rules, config.preprocessor);
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.VSPenSyntaxHighlighter = SyntaxHighlighter;
}