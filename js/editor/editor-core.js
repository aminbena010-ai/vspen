/**
 * ============================================
 * EDITOR CORE - Textarea Management, Cursor, Selección
 * Motor principal del editor basado en textarea + overlay
 * ============================================
 */

class EditorCore {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   */
  constructor(eventBus) {
    this._eventBus = eventBus;

    /** @type {HTMLTextAreaElement|null} */
    this._textarea = null;
    /** @type {HTMLElement|null} */
    this._highlightEl = null;
    /** @type {HTMLElement|null} */
    this._lineNumbersEl = null;

    /** @type {string} Contenido actual */
    this._content = '';
    /** @type {string} Lenguaje actual */
    this._language = 'plaintext';
    /** @type {number} Tamaño de tabulación */
    this._tabSize = VSPenConstants.EDITOR.TAB_SIZE;
    /** @type {boolean} */
    this._readOnly = false;

    // Sub-módulos (se inyectan después vía setModules)
    this._highlighter = null;
    this._lineNumbers = null;
    this._autoClose = null;
    this._undoManager = null;

    // Bindings persistentes para poder removerlos
    this._boundOnInput = this._onInput.bind(this);
    this._boundOnScroll = this._onScroll.bind(this);
    this._boundOnKeyDown = this._onKeyDown.bind(this);
    this._boundOnKeyUp = this._onCursorChange.bind(this);
    this._boundOnClick = this._onCursorChange.bind(this);
    this._boundOnSelect = this._onSelectionChange.bind(this);

    this._debounceTimer = null;
    this._isComposing = false;
  }

  /**
   * Inicializar editor sobre elementos DOM existentes
   * @param {Object} elements
   * @param {HTMLTextAreaElement} elements.textarea
   * @param {HTMLElement} elements.highlight
   * @param {HTMLElement} elements.lineNumbers
   */
  mount(elements) {
    this._textarea = elements.textarea;
    this._highlightEl = elements.highlight;
    this._lineNumbersEl = elements.lineNumbers;

    if (!this._textarea || !this._highlightEl) {
      throw new Error('EditorCore.mount: textarea y highlight son obligatorios');
    }

    // Configurar textarea
    this._textarea.spellcheck = false;
    this._textarea.autocomplete = 'off';
    this._textarea.autocapitalize = 'off';
    this._textarea.setAttribute('data-editor', 'true');

    // Registrar eventos
    this._textarea.addEventListener('input', this._boundOnInput);
    this._textarea.addEventListener('scroll', this._boundOnScroll);
    this._textarea.addEventListener('keydown', this._boundOnKeyDown);
    this._textarea.addEventListener('keyup', this._boundOnKeyUp);
    this._textarea.addEventListener('click', this._boundOnClick);
    this._textarea.addEventListener('select', this._boundOnSelect);
    this._textarea.addEventListener('compositionstart', () => { this._isComposing = true; });
    this._textarea.addEventListener('compositionend', () => {
      this._isComposing = false;
      this._onInput();
    });

    // Sincronización inicial de scroll
    this._syncScroll();

    this._eventBus.emit(VSPenConstants.EVENTS.EDITOR_READY);
  }

  /**
   * Inyectar sub-módulos del editor
   * @param {Object} modules
   */
  setModules(modules) {
    if (modules.highlighter) this._highlighter = modules.highlighter;
    if (modules.lineNumbers) this._lineNumbers = modules.lineNumbers;
    if (modules.autoClose) this._autoClose = modules.autoClose;
    if (modules.undoManager) this._undoManager = modules.undoManager;
  }

  /**
   * Establecer contenido del editor
   * @param {string} content
   * @param {boolean} [resetUndo=true]
   */
  setContent(content, resetUndo = true) {
    this._content = String(content);
    if (this._textarea) {
      this._textarea.value = this._content;
    }
    this._updateHighlight();
    this._updateLineNumbers();

    if (resetUndo && this._undoManager) {
      this._undoManager.reset(this._content);
    }
  }

  /**
   * Obtener contenido actual
   * @returns {string}
   */
  getContent() {
    return this._content;
  }

  /**
   * Establecer lenguaje
   * @param {string} language
   */
  setLanguage(language) {
    this._language = language;
    this._updateHighlight();
    this._eventBus.emit(VSPenConstants.EVENTS.EDITOR_LANGUAGE_CHANGED, { language });
  }

  /**
   * Obtener lenguaje actual
   * @returns {string}
   */
  getLanguage() {
    return this._language;
  }

  /**
   * Establecer modo solo lectura
   * @param {boolean} readOnly
   */
  setReadOnly(readOnly) {
    this._readOnly = Boolean(readOnly);
    if (this._textarea) {
      this._textarea.readOnly = this._readOnly;
    }
  }

  /**
   * Establecer tamaño de tabulación
   * @param {number} size
   */
  setTabSize(size) {
    this._tabSize = Math.max(1, Math.min(8, Number(size) || 2));
    if (this._textarea) {
      this._textarea.tabSize = this._tabSize;
    }
  }

  /**
   * Obtener posición del cursor
   * @returns {{line: number, column: number, offset: number}}
   */
  getCursorPosition() {
    if (!this._textarea) return { line: 1, column: 1, offset: 0 };

    const offset = this._textarea.selectionStart;
    const textBefore = this._content.substring(0, offset);
    const lines = textBefore.split('\n');

    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
      offset
    };
  }

  /**
   * Obtener rango de selección
   * @returns {{start: number, end: number, text: string}}
   */
  getSelection() {
    if (!this._textarea) return { start: 0, end: 0, text: '' };

    const start = this._textarea.selectionStart;
    const end = this._textarea.selectionEnd;

    return {
      start,
      end,
      text: this._content.substring(start, end)
    };
  }

  /**
   * Establecer posición del cursor
   * @param {number} offset
   */
  setCursorPosition(offset) {
    if (!this._textarea) return;
    const clamped = Math.max(0, Math.min(offset, this._content.length));
    this._textarea.selectionStart = clamped;
    this._textarea.selectionEnd = clamped;
    this._onCursorChange();
  }

  /**
   * Insertar texto en la posición actual
   * @param {string} text
   */
  insertText(text) {
    if (!this._textarea || this._readOnly) return;

    const start = this._textarea.selectionStart;
    const end = this._textarea.selectionEnd;

    // Usar execCommand para preservar undo nativo cuando sea posible
    if (document.execCommand) {
      this._textarea.focus();
      document.execCommand('insertText', false, text);
    } else {
      const before = this._content.substring(0, start);
      const after = this._content.substring(end);
      this._content = before + text + after;
      this._textarea.value = this._content;
      this._textarea.selectionStart = this._textarea.selectionEnd = start + text.length;
    }

    this._onInput();
  }

  /**
   * Reemplazar todo el contenido preservando cursor si es posible
   * @param {string} newContent
   */
  replaceContent(newContent) {
    const pos = this.getCursorPosition();
    this.setContent(newContent, false);

    // Restaurar posición si es válida
    const maxOffset = newContent.length;
    const restoredOffset = Math.min(pos.offset, maxOffset);
    if (this._textarea) {
      this._textarea.selectionStart = this._textarea.selectionEnd = restoredOffset;
    }
  }

  /**
   * Enfocar el editor
   */
  focus() {
    if (this._textarea) this._textarea.focus();
  }

  /**
   * Forzar re-renderizado completo
   */
  refresh() {
    this._updateHighlight();
    this._updateLineNumbers();
    this._syncScroll();
  }

  /**
   * Destruir editor y limpiar eventos
   */
  destroy() {
    if (this._textarea) {
      this._textarea.removeEventListener('input', this._boundOnInput);
      this._textarea.removeEventListener('scroll', this._boundOnScroll);
      this._textarea.removeEventListener('keydown', this._boundOnKeyDown);
      this._textarea.removeEventListener('keyup', this._boundOnKeyUp);
      this._textarea.removeEventListener('click', this._boundOnClick);
      this._textarea.removeEventListener('select', this._boundOnSelect);
    }
    clearTimeout(this._debounceTimer);
    this._textarea = null;
    this._highlightEl = null;
    this._lineNumbersEl = null;
  }

  // === PRIVATE EVENT HANDLERS ===

  _onInput() {
    if (this._isComposing) return;
    if (this._readOnly) return;

    const newContent = this._textarea.value;
    const oldContent = this._content;

    if (newContent === oldContent) return;

    // Guardar estado anterior para undo
    if (this._undoManager && newContent !== oldContent) {
      this._undoManager.push(oldContent, this._textarea.selectionStart);
    }

    this._content = newContent;
    this._updateHighlight();
    this._updateLineNumbers();

    // Emitir evento con debounce
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._eventBus.emit(VSPenConstants.EVENTS.EDITOR_CONTENT_CHANGED, {
        content: this._content,
        language: this._language
      });
    }, VSPenConstants.EDITOR.AUTO_SAVE_DEBOUNCE_MS);
  }

  _onScroll() {
    this._syncScroll();
  }

  _onKeyDown(e) {
    if (this._readOnly) return;

    // Tab handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const spaces = ' '.repeat(this._tabSize);
      this.insertText(spaces);
      return;
    }

    // Auto-close pairs
    if (this._autoClose) {
      const handled = this._autoClose.handleKeyDown(e, this._textarea, this._content);
      if (handled) {
        e.preventDefault();
        this._content = this._textarea.value;
        this._updateHighlight();
        this._updateLineNumbers();
        return;
      }
    }

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (this._undoManager) {
        const state = e.shiftKey
          ? this._undoManager.redo()
          : this._undoManager.undo();
        if (state) {
          this._content = state.content;
          this._textarea.value = state.content;
          this._textarea.selectionStart = this._textarea.selectionEnd = state.cursor;
          this._updateHighlight();
          this._updateLineNumbers();
        }
      }
      return;
    }
  }

  _onCursorChange() {
    const pos = this.getCursorPosition();
    this._eventBus.emit(VSPenConstants.EVENTS.EDITOR_CURSOR_MOVED, pos);
  }

  _onSelectionChange() {
    const sel = this.getSelection();
    this._eventBus.emit(VSPenConstants.EVENTS.EDITOR_SELECTION_CHANGED, sel);
  }

  _syncScroll() {
    if (!this._textarea) return;
    if (this._highlightEl) {
      this._highlightEl.scrollTop = this._textarea.scrollTop;
      this._highlightEl.scrollLeft = this._textarea.scrollLeft;
    }
    if (this._lineNumbersEl) {
      this._lineNumbersEl.scrollTop = this._textarea.scrollTop;
    }
  }

  _updateHighlight() {
    if (!this._highlightEl) return;
    if (this._highlighter) {
      const html = this._highlighter.highlight(this._content, this._language);
      this._highlightEl.innerHTML = html + '\n';
    } else {
      this._highlightEl.textContent = this._content + '\n';
    }
  }

  _updateLineNumbers() {
    if (!this._lineNumbersEl) return;
    if (this._lineNumbers) {
      const lineCount = this._content.split('\n').length;
      this._lineNumbersEl.textContent = this._lineNumbers.render(lineCount);
    } else {
      const lines = this._content.split('\n').length;
      let text = '';
      for (let i = 1; i <= lines; i++) text += i + '\n';
      this._lineNumbersEl.textContent = text;
    }
  }
}

if (typeof window !== 'undefined') {
  window.VSPenEditorCore = EditorCore;
}