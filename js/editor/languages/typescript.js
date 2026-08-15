/**
 * ============================================
 * LANGUAGE: TypeScript / TSX
 * Reglas de resaltado para TypeScript y TSX
 * ============================================
 */

const TypeScriptLanguage = {
  rules: [
    // Comentarios (deben ir primero para tener prioridad)
    { pattern: /(\/\/[^\n]*)/g, className: 'tok-comment' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, className: 'tok-comment' },

    // Strings template literals
    { pattern: /(`(?:[^`\\]|\\.)*`)/g, className: 'tok-string' },

    // Strings regulares
    { pattern: /("(?:[^"\\]|\\.)*")/g, className: 'tok-string' },
    { pattern: /('(?:[^'\\]|\\.)*')/g, className: 'tok-string' },

    // JSX Tags (componentes con mayúscula)
    { pattern: /(&lt;\/?[A-Z][a-zA-Z0-9.]*)/g, className: 'tok-jsx' },
    // JSX Tags (elementos HTML lowercase)
    { pattern: /(&lt;\/?[a-z][a-z0-9-]*)/g, className: 'tok-tag' },
    // Cierre de tags
    { pattern: /(\/?&gt;)/g, className: 'tok-punct' },

    // Type annotations
    { pattern: /\b(interface|type|enum|namespace|declare|abstract|implements|readonly)\b/g, className: 'tok-type' },
    { pattern: /\b(string|number|boolean|any|void|never|unknown|object|symbol|bigint)\b/g, className: 'tok-type' },

    // Keywords
    { pattern: /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|throw|try|catch|finally|new|delete|typeof|instanceof|in|of|as|is|keyof|infer|extends|import|export|from|default|class|async|await|yield|static|public|private|protected|override|get|set|constructor|super|this|null|undefined|true|false)\b/g, className: 'tok-keyword' },

    // Decorators
    { pattern: /(@[a-zA-Z_$][a-zA-Z0-9_$]*)/g, className: 'tok-function' },

    // Function calls
    { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, className: 'tok-function' },

    // Numbers
    { pattern: /\b(\d+\.?\d*(?:[eE][+-]?\d+)?|0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+)\b/g, className: 'tok-number' },

    // Attributes JSX
    { pattern: /\s([a-zA-Z_$][a-zA-Z0-9_$-]*)(?==)/g, className: 'tok-attr' },

    // Operators
    { pattern: /(=&gt;|===|!==|==|!=|&lt;=|&gt;=|&amp;&amp;|\|\||[+\-*/%]=?|[!~^&|])/g, className: 'tok-operator' },

    // Punctuation
    { pattern: /([{}[\](),;:.])/g, className: 'tok-punct' }
  ],

  preprocessor: null
};

// Registrar globalmente para que SyntaxHighlighter lo encuentre
if (typeof window !== 'undefined') {
  if (!window.VSPenLanguages) window.VSPenLanguages = {};
  window.VSPenLanguages.typescript = TypeScriptLanguage;
  window.VSPenLanguages.tsx = TypeScriptLanguage;
  window.VSPenLanguages.ts = TypeScriptLanguage;
}