/**
 * ============================================
 * LINE NUMBERS - Renderizado + Sync Scroll
 * Generación eficiente de números de línea
 * ============================================
 */

class LineNumbers {
  constructor() {
    /** @type {number} Última cantidad renderizada (cache) */
    this._lastCount = 0;
    /** @type {string} Último output generado (cache) */
    this._cachedOutput = '';
    /** @type {number} Línea activa actual */
    this._activeLine = -1;
  }

  /**
   * Generar texto de números de línea
   * @param {number} count - Cantidad de líneas
   * @returns {string} Texto con saltos de línea
   */
  render(count) {
    if (count === this._lastCount && this._activeLine === -1) {
      return this._cachedOutput;
    }

    const lines = [];
    for (let i = 1; i <= count; i++) {
      lines.push(i);
    }

    this._lastCount = count;
    this._cachedOutput = lines.join('\n') + '\n';
    return this._cachedOutput;
  }

  /**
   * Generar HTML con línea activa resaltada
   * @param {number} count - Cantidad de líneas
   * @param {number} activeLine - Número de línea activa (1-based)
   * @returns {string} HTML con spans
   */
  renderWithActiveLine(count, activeLine) {
    const lines = [];
    for (let i = 1; i <= count; i++) {
      if (i === activeLine) {
        lines.push(`<span class="line-numbers__active">${i}</span>`);
      } else {
        lines.push(String(i));
      }
    }
    return lines.join('\n') + '\n';
  }

  /**
   * Establecer línea activa
   * @param {number} line - Número de línea (1-based)
   */
  setActiveLine(line) {
    this._activeLine = line;
  }

  /**
   * Calcular línea desde offset de cursor
   * @param {string} content - Contenido del editor
   * @param {number} offset - Posición del cursor
   * @returns {number} Número de línea (1-based)
   */
  getLineFromOffset(content, offset) {
    const textBefore = content.substring(0, offset);
    return textBefore.split('\n').length;
  }

  /**
   * Obtener offset de inicio de una línea
   * @param {string} content
   * @param {number} lineNumber - 1-based
   * @returns {number} Offset del inicio de la línea
   */
  getOffsetOfLine(content, lineNumber) {
    const lines = content.split('\n');
    let offset = 0;
    for (let i = 0; i < lineNumber - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1; // +1 por \n
    }
    return offset;
  }

  /**
   * Obtener cantidad de líneas en contenido
   * @param {string} content
   * @returns {number}
   */
  getLineCount(content) {
    if (!content) return 1;
    return content.split('\n').length;
  }

  /**
   * Resetear cache
   */
  clearCache() {
    this._lastCount = 0;
    this._cachedOutput = '';
    this._activeLine = -1;
  }
}

if (typeof window !== 'undefined') {
  window.VSPenLineNumbers = LineNumbers;
}