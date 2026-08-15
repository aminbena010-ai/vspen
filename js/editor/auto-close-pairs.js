/**
 * ============================================
 * AUTO-CLOSE PAIRS - Pares Configurables
 * Cierre automático de (), {}, [], "", '', ``
 * ============================================
 */

class AutoClosePairs {
  constructor() {
    /** @type {Map<string, string>} Mapa de apertura → cierre */
    this._pairs = new Map([
      ['(', ')'],
      ['{', '}'],
      ['[', ']'],
      ['"', '"'],
      ["'", "'"],
      ['`', '`']
    ]);

    /** @type {Set<string>} Caracteres de cierre */
    this._closingChars = new Set([')', '}', ']', '"', "'", '`']);

    /** @type {Set<string>} Contextos donde NO auto-cerrar (ej: dentro de strings) */
    this._disabledInComments = true;
  }

  /**
   * Manejar keydown para auto-cierre
   * @param {KeyboardEvent} e
   * @param {HTMLTextAreaElement} textarea
   * @param {string} content
   * @returns {boolean} true si se manejó el evento
   */
  handleKeyDown(e, textarea, content) {
    const key = e.key;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const hasSelection = start !== end;

    // Caso 1: Escribir carácter de apertura con texto seleccionado → envolver
    if (hasSelection && this._pairs.has(key)) {
      const selectedText = content.substring(start, end);
      const closingChar = this._pairs.get(key);
      const wrapped = key + selectedText + closingChar;

      textarea.value = content.substring(0, start) + wrapped + content.substring(end);
      textarea.selectionStart = start + 1;
      textarea.selectionEnd = end + 1;
      return true;
    }

    // Caso 2: Escribir carácter de apertura sin selección → auto-cerrar
    if (!hasSelection && this._pairs.has(key)) {
      const closingChar = this._pairs.get(key);

      // No auto-cerrar comillas si el siguiente char ya es la misma comilla
      if ((key === '"' || key === "'" || key === '`') &&
          content[start] === key) {
        // Simplemente mover cursor sobre la comilla existente
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        return true;
      }

      const insertion = key + closingChar;
      textarea.value = content.substring(0, start) + insertion + content.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      return true;
    }

    // Caso 3: Escribir carácter de cierre que ya existe adelante → saltarlo
    if (!hasSelection && this._closingChars.has(key) && content[start] === key) {
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      return true;
    }

    // Caso 4: Backspace elimina par vacío
    if (e.key === 'Backspace' && !hasSelection && start > 0) {
      const charBefore = content[start - 1];
      const charAfter = content[start];

      if (this._pairs.has(charBefore) && this._pairs.get(charBefore) === charAfter) {
        textarea.value = content.substring(0, start - 1) + content.substring(start + 1);
        textarea.selectionStart = textarea.selectionEnd = start - 1;
        return true;
      }
    }

    // Caso 5: Enter dentro de llaves/corchetes → indentar
    if (e.key === 'Enter' && !hasSelection) {
      const charBefore = content[start - 1];
      const charAfter = content[start];

      if ((charBefore === '{' && charAfter === '}') ||
          (charBefore === '[' && charAfter === ']') ||
          (charBefore === '(' && charAfter === ')')) {
        const lineStart = content.lastIndexOf('\n', start - 1) + 1;
        const currentIndent = content.substring(lineStart, start).match(/^(\s*)/)[1];
        const indent = currentIndent + '  ';

        const insertion = '\n' + indent + '\n' + currentIndent;
        textarea.value = content.substring(0, start) + insertion + content.substring(start);
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        return true;
      }
    }

    return false;
  }

  /**
   * Añadir par personalizado
   * @param {string} open
   * @param {string} close
   */
  addPair(open, close) {
    this._pairs.set(open, close);
    this._closingChars.add(close);
  }

  /**
   * Remover par
   * @param {string} open
   */
  removePair(open) {
    const close = this._pairs.get(open);
    this._pairs.delete(open);
    if (close) this._closingChars.delete(close);
  }

  /**
   * Obtener todos los pares configurados
   * @returns {Object}
   */
  getPairs() {
    const result = {};
    for (const [open, close] of this._pairs) {
      result[open] = close;
    }
    return result;
  }
}

if (typeof window !== 'undefined') {
  window.VSPenAutoClosePairs = AutoClosePairs;
}