/**
 * ============================================
 * LANGUAGE: CSS
 * Reglas de resaltado para CSS
 * ============================================
 */

const CSSLanguage = {
  rules: [
    // Comentarios
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'tok-comment' },

    // Strings
    { pattern: /("(?:[^"\\]|\\.)*")/g, className: 'tok-string' },
    { pattern: /('(?:[^'\\]|\\.)*')/g, className: 'tok-string' },

    // At-rules
    { pattern: /(@[a-zA-Z-]+)/g, className: 'tok-keyword' },

    // Selectors (clases, IDs, pseudo-clases)
    { pattern: /(\.[a-zA-Z_-][a-zA-Z0-9_-]*)/g, className: 'tok-function' },
    { pattern: /(#[a-zA-Z_-][a-zA-Z0-9_-]*)/g, className: 'tok-variable' },
    { pattern: /(:{1,2}[a-zA-Z-]+)/g, className: 'tok-keyword' },

    // Properties
    { pattern: /([a-zA-Z-]+)\s*(?=:)/g, className: 'tok-attr' },

    // Values con unidades
    { pattern: /\b(\d+\.?\d*(px|em|rem|%|vh|vw|vmin|vmax|deg|rad|turn|s|ms|fr|ch)?)\b/g, className: 'tok-number' },

    // Colores hex
    { pattern: /(#[0-9a-fA-F]{3,8})\b/g, className: 'tok-number' },

    // Funciones CSS
    { pattern: /\b(calc|var|rgb|rgba|hsl|hsla|url|linear-gradient|radial-gradient|min|max|clamp|env|attr|counter|counters)\s*(?=\()/g, className: 'tok-function' },

    // Important
    { pattern: /(!important)/g, className: 'tok-keyword' },

    // Custom properties
    { pattern: /(--[a-zA-Z0-9_-]+)/g, className: 'tok-variable' },

    // Tags HTML como selectores
    { pattern: /\b(html|body|div|span|p|a|ul|ol|li|h[1-6]|img|form|input|button|table|tr|td|th|header|footer|nav|main|section|article|aside)\b/g, className: 'tok-tag' },

    // Punctuation
    { pattern: /([{}();:,])/g, className: 'tok-punct' }
  ],

  preprocessor: null
};

if (typeof window !== 'undefined') {
  if (!window.VSPenLanguages) window.VSPenLanguages = {};
  window.VSPenLanguages.css = CSSLanguage;
}