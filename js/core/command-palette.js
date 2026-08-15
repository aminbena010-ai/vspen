/**
 * ============================================
 * COMMAND PALETTE - Sistema de Comandos Registrables
 * Ctrl+K style, extensible por cualquier módulo
 * ============================================
 */

class CommandPalette {
  /**
   * @param {import('./event-bus').EventBus} eventBus
   * @param {import('./storage-service').StorageService} storage
   */
  constructor(eventBus, storage) {
    this._eventBus = eventBus;
    this._storage = storage;

    /** @type {Map<string, {id: string, label: string, category: string, handler: Function, keybinding: string|null, when: Function|null}>} */
    this._commands = new Map();

    /** @type {Array<{id: string, timestamp: number}>} */
    this._history = this._storage.get(VSPenConstants.STORAGE.COMMAND_HISTORY, []);

    this._isOpen = false;
    this._overlayEl = null;
    this._inputEl = null;
    this._listEl = null;
    this._filteredCommands = [];
    this._selectedIndex = 0;

    this._registerDefaultCommands();
    this._bindGlobalShortcut();
  }

  /**
   * Registrar un comando
   * @param {Object} command
   * @param {string} command.id - ID único (ej: "file.save", "editor.undo")
   * @param {string} command.label - Texto visible (ej: "Guardar Archivo")
   * @param {string} [command.category="General"] - Categoría para agrupar
   * @param {Function} command.handler - Función a ejecutar
   * @param {string} [command.keybinding=null] - Atajo mostrado (ej: "Ctrl+S")
   * @param {Function} [command.when=null] - Función que retorna boolean para visibilidad condicional
   */
  register(command) {
    if (!command.id || !command.label || typeof command.handler !== 'function') {
      throw new Error('CommandPalette.register: id, label y handler son obligatorios');
    }

    this._commands.set(command.id, {
      id: command.id,
      label: command.label,
      category: command.category || 'General',
      handler: command.handler,
      keybinding: command.keybinding || null,
      when: command.when || null
    });
  }

  /**
   * Ejecutar un comando por ID
   * @param {string} id
   * @param {*} [context] - Contexto opcional pasado al handler
   * @returns {boolean} true si se ejecutó
   */
  execute(id, context) {
    const cmd = this._commands.get(id);
    if (!cmd) {
      console.warn(`[CommandPalette] Comando "${id}" no encontrado`);
      return false;
    }

    if (cmd.when && !cmd.when()) {
      console.warn(`[CommandPalette] Comando "${id}" no disponible (when=false)`);
      return false;
    }

    try {
      cmd.handler(context);
      this._addToHistory(id);
      return true;
    } catch (err) {
      console.error(`[CommandPalette] Error ejecutando "${id}":`, err);
      return false;
    }
  }

  /**
   * Abrir la paleta de comandos
   */
  open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this._render();
    this._filter('');
    this._eventBus.emit(VSPenConstants.EVENTS.MODAL_OPENED, { type: 'command-palette' });

    // Focus input después de renderizar
    requestAnimationFrame(() => {
      if (this._inputEl) this._inputEl.focus();
    });
  }

  /**
   * Cerrar la paleta
   */
  close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    if (this._overlayEl) {
      this._overlayEl.classList.remove('visible');
      setTimeout(() => {
        if (this._overlayEl) this._overlayEl.remove();
        this._overlayEl = null;
      }, 200);
    }
    this._eventBus.emit(VSPenConstants.EVENTS.MODAL_CLOSED, { type: 'command-palette' });
  }

  /**
   * Toggle abrir/cerrar
   */
  toggle() {
    this._isOpen ? this.close() : this.open();
  }

  /**
   * Obtener todos los comandos disponibles
   * @returns {Array}
   */
  getCommands() {
    const result = [];
    for (const cmd of this._commands.values()) {
      if (!cmd.when || cmd.when()) {
        result.push(cmd);
      }
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }

  // === PRIVATE METHODS ===

  _registerDefaultCommands() {
    this.register({
      id: 'palette.toggle',
      label: 'Abrir Paleta de Comandos',
      category: 'Sistema',
      handler: () => this.toggle(),
      keybinding: 'Ctrl+K'
    });

    this.register({
      id: 'theme.toggle',
      label: 'Cambiar Tema Claro/Oscuro',
      category: 'Apariencia',
      handler: () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light-default' ? 'dark-default' : 'light-default';
        document.documentElement.setAttribute('data-theme', next);
        this._eventBus.emit(VSPenConstants.EVENTS.THEME_CHANGED, { theme: next });
      },
      keybinding: null
    });
  }

  _bindGlobalShortcut() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K o Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      // Escape cierra
      if (e.key === 'Escape' && this._isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }

  _addToHistory(id) {
    this._history = this._history.filter(h => h.id !== id);
    this._history.unshift({ id, timestamp: Date.now() });
    this._history = this._history.slice(0, 20);
    this._storage.set(VSPenConstants.STORAGE.COMMAND_HISTORY, this._history);
  }

  _render() {
    // Crear overlay
    this._overlayEl = document.createElement('div');
    this._overlayEl.className = 'modal-overlay';
    this._overlayEl.innerHTML = `
      <div class="command-palette" style="
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        width: 500px;
        max-width: 90vw;
        max-height: 400px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      ">
        <div style="padding: 8px 12px; border-bottom: 1px solid var(--border);">
          <input type="text" placeholder="Escribe un comando..." 
            style="width:100%; background:var(--bg-primary); border:1px solid var(--border);
            border-radius:var(--radius-md); padding:6px 10px; color:var(--fg-primary);
            font-size:14px; outline:none; font-family:var(--font-ui);" />
        </div>
        <div class="command-list" style="flex:1; overflow-y:auto; padding:4px 0;"></div>
      </div>
    `;

    this._inputEl = this._overlayEl.querySelector('input');
    this._listEl = this._overlayEl.querySelector('.command-list');

    // Event listeners
    this._inputEl.addEventListener('input', (e) => this._filter(e.target.value));
    this._inputEl.addEventListener('keydown', (e) => this._handleInputKeydown(e));
    this._overlayEl.addEventListener('click', (e) => {
      if (e.target === this._overlayEl) this.close();
    });

    document.body.appendChild(this._overlayEl);
    requestAnimationFrame(() => this._overlayEl.classList.add('visible'));
  }

  _filter(query) {
    const q = query.toLowerCase().trim();
    const allCommands = this.getCommands();

    if (!q) {
      // Mostrar recientes primero, luego todos
      const recentIds = new Set(this._history.map(h => h.id));
      this._filteredCommands = [
        ...allCommands.filter(c => recentIds.has(c.id)),
        ...allCommands.filter(c => !recentIds.has(c.id))
      ];
    } else {
      this._filteredCommands = allCommands.filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }

    this._selectedIndex = 0;
    this._renderList();
  }

  _renderList() {
    if (!this._listEl) return;

    if (this._filteredCommands.length === 0) {
      this._listEl.innerHTML = '<div style="padding:12px;color:var(--fg-muted);text-align:center;">No se encontraron comandos</div>';
      return;
    }

    let html = '';
    let lastCategory = '';

    for (let i = 0; i < this._filteredCommands.length; i++) {
      const cmd = this._filteredCommands[i];

      if (cmd.category !== lastCategory) {
        lastCategory = cmd.category;
        html += `<div style="padding:6px 12px 2px;font-size:11px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.5px;">${lastCategory}</div>`;
      }

      const isSelected = i === this._selectedIndex;
      const bg = isSelected ? 'background:var(--accent-muted);' : '';
      const kb = cmd.keybinding ? `<span style="font-size:11px;color:var(--fg-muted);margin-left:auto;">${cmd.keybinding}</span>` : '';

      html += `<div class="cmd-item" data-index="${i}" style="
        padding:6px 12px; cursor:pointer; display:flex; align-items:center; gap:8px;
        font-size:13px; color:var(--fg-primary); transition:background 0.1s; ${bg}
      " onmouseenter="this.style.background='var(--bg-hover)'" 
         onmouseleave="this.style.background='${isSelected ? 'var(--accent-muted)' : ''}'"
      >
        <span>${cmd.label}</span>
        ${kb}
      </div>`;
    }

    this._listEl.innerHTML = html;

    // Click handlers
    const items = this._listEl.querySelectorAll('.cmd-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'));
        this._executeSelected(idx);
      });
    });
  }

  _handleInputKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._selectedIndex = Math.min(this._selectedIndex + 1, this._filteredCommands.length - 1);
        this._renderList();
        this._scrollSelectedIntoView();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
        this._renderList();
        this._scrollSelectedIntoView();
        break;
      case 'Enter':
        e.preventDefault();
        this._executeSelected(this._selectedIndex);
        break;
      case 'Escape':
        e.preventDefault();
        this.close();
        break;
    }
  }

  _executeSelected(index) {
    const cmd = this._filteredCommands[index];
    if (cmd) {
      this.close();
      this.execute(cmd.id);
    }
  }

  _scrollSelectedIntoView() {
    const selected = this._listEl?.querySelector(`[data-index="${this._selectedIndex}"]`);
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }
}

if (typeof window !== 'undefined') {
  window.VSPenCommandPalette = CommandPalette;
}