/**
 * ============================================
 * UNDO MANAGER - Stack Limitado de Operaciones
 * Historial de cambios con undo/redo eficiente
 * ============================================
 */

class UndoManager {
  /**
   * @param {number} [maxSize=100] - Tamaño máximo del stack
   */
  constructor(maxSize) {
    this._maxSize = maxSize || VSPenConstants.EDITOR.UNDO_STACK_LIMIT;

    /** @type {Array<{content: string, cursor: number, timestamp: number}>} */
    this._undoStack = [];

    /** @type {Array<{content: string, cursor: number, timestamp: number}>} */
    this._redoStack = [];

    /** @type {string} Último estado guardado (para evitar duplicados) */
    this._lastSaved = '';

    /** @type {number} Timestamp del último push (para agrupar cambios rápidos) */
    this._lastPushTime = 0;

    /** @type {number} Ventana de agrupación en ms */
    this._groupWindowMs = 500;
  }

  /**
   * Guardar estado antes de un cambio
   * @param {string} content - Contenido ANTES del cambio
   * @param {number} cursor - Posición del cursor ANTES del cambio
   */
  push(content, cursor) {
    const now = Date.now();

    // Evitar duplicados consecutivos
    if (content === this._lastSaved) return;

    // Agrupar cambios rápidos: reemplazar último entry si está dentro de la ventana
    const shouldGroup = (now - this._lastPushTime) < this._groupWindowMs &&
                        this._undoStack.length > 0;

    if (shouldGroup) {
      // Mantener el estado original (antes de la secuencia rápida)
      // pero actualizar timestamp
      this._undoStack[this._undoStack.length - 1].timestamp = now;
    } else {
      this._undoStack.push({
        content,
        cursor: Math.max(0, cursor),
        timestamp: now
      });

      // Limitar tamaño
      if (this._undoStack.length > this._maxSize) {
        this._undoStack.shift();
      }
    }

    // Cualquier nuevo cambio limpia el redo stack
    this._redoStack = [];

    this._lastSaved = content;
    this._lastPushTime = now;
  }

  /**
   * Deshacer último cambio
   * @returns {{content: string, cursor: number}|null} Estado a restaurar o null
   */
  undo() {
    if (this._undoStack.length === 0) return null;

    const state = this._undoStack.pop();

    // Guardar estado actual en redo stack
    this._redoStack.push({
      content: this._lastSaved,
      cursor: state.cursor,
      timestamp: Date.now()
    });

    this._lastSaved = state.content;
    return { content: state.content, cursor: state.cursor };
  }

  /**
   * Rehacer último cambio deshecho
   * @returns {{content: string, cursor: number}|null}
   */
  redo() {
    if (this._redoStack.length === 0) return null;

    const state = this._redoStack.pop();

    // Guardar estado actual en undo stack
    this._undoStack.push({
      content: this._lastSaved,
      cursor: state.cursor,
      timestamp: Date.now()
    });

    this._lastSaved = state.content;
    return { content: state.content, cursor: state.cursor };
  }

  /**
   * Verificar si hay operaciones para deshacer
   * @returns {boolean}
   */
  canUndo() {
    return this._undoStack.length > 0;
  }

  /**
   * Verificar si hay operaciones para rehacer
   * @returns {boolean}
   */
  canRedo() {
    return this._redoStack.length > 0;
  }

  /**
   * Resetear historial con un estado inicial
   * @param {string} initialContent
   */
  reset(initialContent) {
    this._undoStack = [];
    this._redoStack = [];
    this._lastSaved = initialContent || '';
    this._lastPushTime = 0;
  }

  /**
   * Obtener tamaño del stack de undo
   * @returns {number}
   */
  getUndoSize() {
    return this._undoStack.length;
  }

  /**
   * Obtener tamaño del stack de redo
   * @returns {number}
   */
  getRedoSize() {
    return this._redoStack.length;
  }

  /**
   * Limpiar completamente ambos stacks
   */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this._lastSaved = '';
    this._lastPushTime = 0;
  }
}

if (typeof window !== 'undefined') {
  window.VSPenUndoManager = UndoManager;
}