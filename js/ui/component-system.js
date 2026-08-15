/**
 * ============================================
 * COMPONENT SYSTEM - Renderizado Declarativo Vanilla
 * Micro-framework reactivo sin dependencias externas
 * ============================================
 */

class ComponentSystem {
  constructor() {
    /** @type {Map<string, Function>} Componentes registrados */
    this._components = new Map();
    
    /** @type {Map<HTMLElement, Object>} Estado interno por instancia DOM */
    this._instances = new WeakMap();
    
    /** @type {Set<Function>} Hooks globales post-render */
    this._postRenderHooks = new Set();
  }

  /**
   * Registrar un componente reutilizable
   * @param {string} name - Nombre en kebab-case (ej: "file-explorer")
   * @param {Function} renderFn - (props, state, update) => HTMLElement|string
   */
  register(name, renderFn) {
    if (typeof renderFn !== 'function') {
      throw new TypeError(`ComponentSystem.register: "${name}" debe ser función`);
    }
    this._components.set(name, renderFn);
  }

  /**
   * Montar un componente en un contenedor DOM
   * @param {HTMLElement} container - Elemento contenedor
   * @param {string} componentName - Nombre registrado
   * @param {Object} [initialProps={}] - Props iniciales
   * @returns {Object} Instancia con métodos update(), destroy(), getState()
   */
  mount(container, componentName, initialProps = {}) {
    const renderFn = this._components.get(componentName);
    if (!renderFn) {
      throw new Error(`ComponentSystem.mount: Componente "${componentName}" no registrado`);
    }

    let state = {};
    let isDestroyed = false;

    // Función de actualización reactiva
    const update = (newStateOrFn) => {
      if (isDestroyed) return;
      
      if (typeof newStateOrFn === 'function') {
        state = { ...state, ...newStateOrFn(state) };
      } else {
        state = { ...state, ...newStateOrFn };
      }
      
      this._render(container, renderFn, initialProps, state, update);
    };

    // Render inicial
    this._render(container, renderFn, initialProps, state, update);

    // Guardar referencia de instancia
    const instance = {
      update,
      getState: () => ({ ...state }),
      setProps: (newProps) => {
        Object.assign(initialProps, newProps);
        update({}); // Trigger re-render
      },
      destroy: () => {
        isDestroyed = true;
        container.innerHTML = '';
        this._instances.delete(container);
      }
    };

    this._instances.set(container, instance);
    return instance;
  }

  /**
   * Crear elemento HTML desde template string seguro
   * @param {string} html 
   * @returns {HTMLElement}
   */
  createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  /**
   * Registrar hook post-render global
   * @param {Function} hook - (container) => void
   * @returns {Function} Unsubscribe
   */
  onPostRender(hook) {
    this._postRenderHooks.add(hook);
    return () => this._postRenderHooks.delete(hook);
  }

  // === PRIVATE ===

  _render(container, renderFn, props, state, update) {
    try {
      const result = renderFn(props, state, update);
      
      if (typeof result === 'string') {
        container.innerHTML = result;
      } else if (result instanceof HTMLElement) {
        container.innerHTML = '';
        container.appendChild(result);
      }

      // Ejecutar hooks post-render
      for (const hook of this._postRenderHooks) {
        try { hook(container); } catch(e) { console.error('[ComponentSystem] Post-render hook error:', e); }
      }
    } catch (err) {
      console.error('[ComponentSystem] Render error:', err);
      container.innerHTML = `<div style="color:var(--error);padding:8px;">Render Error: ${err.message}</div>`;
    }
  }
}

if (typeof window !== 'undefined') {
  window.VSPenComponentSystem = ComponentSystem;
}