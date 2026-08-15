/**
 * ============================================
 * LANGUAGE: JavaScript / JSX
 * Reglas de resaltado para JavaScript y JSX
 * ============================================
 */

const JavaScriptLanguage = {
  rules: [
    // Comentarios
    { pattern: /(\/\/[^\n]*)/g, className: 'tok-comment' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'tok-comment' },

    // Template literals
    { pattern: /(`(?:[^`\\]|\\.)*`)/g, className: 'tok-string' },

    // Strings
    { pattern: /("(?:[^"\\]|\\.)*")/g, className: 'tok-string' },
    { pattern: /('(?:[^'\\]|\\.)*')/g, className: 'tok-string' },

    // Regex literals (simplificado)
    { pattern: /(\/(?![/*])(?:[^/\\]|\\.)+\/[gimsuy]*)/g, className: 'tok-string' },

    // JSX Tags
    { pattern: /(&lt;\/?[A-Z][a-zA-Z0-9.]*)/g, className: 'tok-jsx' },
    { pattern: /(&lt;\/?[a-z][a-z0-9-]*)/g, className: 'tok-tag' },
    { pattern: /(\/?&gt;)/g, className: 'tok-punct' },

    // Keywords
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|throw|try|catch|finally|new|delete|typeof|instanceof|in|of|import|export|from|default|class|extends|async|await|yield|static|get|set|constructor|super|this|null|undefined|true|false|NaN|Infinity)\b/g, className: 'tok-keyword' },

    // Built-in objects
    { pattern: /\b(console|window|document|Math|JSON|Array|Object|String|Number|Boolean|Date|RegExp|Error|Promise|Map|Set|Symbol|Proxy|Reflect|parseInt|parseFloat|isNaN|isFinite|setTimeout|setInterval|clearTimeout|clearInterval|fetch|require|module|exports)\b/g, className: 'tok-builtin' },

    // Function calls
    { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, className: 'tok-function' },

    // Numbers
    { pattern: /\b(\d+\.?\d*(?:[eE][+-]?\d+)?|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)\b/g, className: 'tok-number' },

    // JSX Attributes
    { pattern: /\s([a-zA-Z_$][a-zA-Z0-9_$-]*)(?==)/g, className: 'tok-attr' },

    // Operators
    { pattern: /(=&gt;|===|!==|==|!=|&lt;=|&gt;=|&amp;&amp;|\|\||[+\-*/%]=?|[!~^&|?]|\.{3})/g, className: 'tok-operator' },

    // Punctuation
    { pattern: /([{}[\](),;:.])/g, className: 'tok-punct' }
  ],

  preprocessor: null
};

if (typeof window !== 'undefined') {
  if (!window.VSPenLanguages) window.VSPenLanguages = {};
  window.VSPenLanguages.javascript = JavaScriptLanguage;
  window.VSPenLanguages.jsx = JavaScriptLanguage;
  window.VSPenLanguages.js = JavaScriptLanguage;
}