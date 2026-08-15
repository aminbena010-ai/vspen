/**
 * ============================================
 * LANGUAGE: HTML
 * Reglas de resaltado para HTML
 * ============================================
 */

const HTMLLanguage = {
  rules: [
    // Comentarios HTML
    { pattern: /(&lt;!--[\s\S]*?--&gt;)/g, className: 'tok-comment' },

    // DOCTYPE
    { pattern: /(&lt;!DOCTYPE[^&]*&gt;)/gi, className: 'tok-keyword' },

    // Tags de cierre
    { pattern: /(&lt;\/[a-zA-Z][a-zA-Z0-9-]*)/g, className: 'tok-tag' },

    // Tags de apertura
    { pattern: /(&lt;[a-zA-Z][a-zA-Z0-9-]*)/g, className: 'tok-tag' },

    // Cierre de tag
    { pattern: /(\/?&gt;)/g, className: 'tok-punct' },

    // Atributos
    { pattern: /\s([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?==)/g, className: 'tok-attr' },

    // Valores de atributos con comillas dobles
    { pattern: /(=&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, className: 'tok-string' },

    // Valores de atributos con comillas simples
    { pattern: /(=&#39;(?:[^&]|&(?!#39;))*?&#39;)/g, className: 'tok-string' },

    // Entidades HTML
    { pattern: /(&[a-zA-Z]+;|&#[0-9]+;|&#x[0-9a-fA-F]+;)/g, className: 'tok-number' },

    // Script/style tags internos (marcadores visuales)
    { pattern: /\b(script|style|template|slot)\b/g, className: 'tok-keyword' }
  ],

  /**
   * Preprocesador: escapar HTML antes de aplicar reglas
   * Las reglas ya esperan entidades escapadas (&lt;, &gt;, etc.)
   */
  preprocessor: function(code) {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

if (typeof window !== 'undefined') {
  if (!window.VSPenLanguages) window.VSPenLanguages = {};
  window.VSPenLanguages.html = HTMLLanguage;
}