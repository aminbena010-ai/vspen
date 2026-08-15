/**
 * ============================================
 * VIRTUAL FILE SYSTEM - Clase VFS en Memoria
 * Gestión completa del árbol de archivos virtual
 * ============================================
 */

class VirtualFileSystem {
  /**
   * @param {import('../core/event-bus').EventBus} eventBus
   * @param {import('../core/storage-service').StorageService} storage
   */
  constructor(eventBus, storage) {
    this._eventBus = eventBus;
    this._storage = storage;

    /** @type {FileNode} Raíz del sistema de archivos */
    this._root = new FileNode({ name: '/', type: 'directory' });

    /** @type {string|null} Archivo actualmente abierto */
    this._currentFilePath = null;

    // Cargar estado persistido
    this._loadFromStorage();
  }

  // === READ OPERATIONS ===

  /**
   * Obtener nodo por ruta absoluta
   * @param {string} path - Ej: "/src/app.tsx"
   * @returns {FileNode|null}
   */
  getNode(path) {
    if (path === '/' || path === '') return this._root;
    return this._root.resolve(path);
  }

  /**
   * Leer contenido de un archivo
   * @param {string} path
   * @returns {string|null} Contenido o null si no existe/no es archivo
   */
  readFile(path) {
    const node = this.getNode(path);
    if (!node || !node.isFile()) return null;
    return node.content;
  }

  /**
   * Listar hijos de un directorio
   * @param {string} path - Ruta del directorio ('/' para raíz)
   * @returns {FileNode[]|null} Array ordenado o null si no es directorio
   */
  listDirectory(path) {
    const node = this.getNode(path);
    if (!node || !node.isDirectory()) return null;
    return node.getSortedChildren();
  }

  /**
   * Verificar si existe un nodo
   * @param {string} path
   * @returns {boolean}
   */
  exists(path) {
    return this.getNode(path) !== null;
  }

  /**
   * Obtener metadata de un nodo
   * @param {string} path
   * @returns {Object|null}
   */
  stat(path) {
    const node = this.getNode(path);
    if (!node) return null;

    return {
      name: node.name,
      path: node.getPath(),
      type: node.type,
      language: node.language,
      size: node.getSizeBytes(),
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
      childCount: node.isDirectory() ? node.children.size : 0
    };
  }

  /**
   * Obtener archivo actual
   * @returns {string|null}
   */
  getCurrentFile() {
    return this._currentFilePath;
  }

  // === WRITE OPERATIONS ===

  /**
   * Crear un nuevo archivo
   * @param {string} path - Ruta absoluta ej: "/src/utils/helper.ts"
   * @param {string} [content='']
   * @returns {boolean} true si se creó
   */
  createFile(path, content = '') {
    const result = this._createNode(path, 'file', content);
    if (result.success) {
      this._persist();
      this._eventBus.emit(VSPenConstants.EVENTS.FILE_CREATED, {
        path,
        node: result.node
      });
    }
    return result.success;
  }

  /**
   * Crear un nuevo directorio
   * @param {string} path - Ruta absoluta ej: "/src/components"
   * @returns {boolean}
   */
  createDirectory(path) {
    const result = this._createNode(path, 'directory');
    if (result.success) {
      this._persist();
      this._eventBus.emit(VSPenConstants.EVENTS.DIRECTORY_CREATED, {
        path,
        node: result.node
      });
    }
    return result.success;
  }

  /**
   * Escribir/actualizar contenido de un archivo
   * @param {string} path
   * @param {string} content
   * @returns {boolean}
   */
  writeFile(path, content) {
    const node = this.getNode(path);
    if (!node || !node.isFile()) {
      console.warn(`[VFS] writeFile: "${path}" no es un archivo válido`);
      return false;
    }

    const oldContent = node.content;
    node.content = String(content);
    node.modifiedAt = Date.now();

    this._persist();
    this._eventBus.emit(VSPenConstants.EVENTS.FILE_UPDATED, {
      path,
      oldContent,
      newContent: content,
      node
    });

    return true;
  }

  /**
   * Renombrar/mover un nodo
   * @param {string} oldPath
   * @param {string} newPath
   * @returns {boolean}
   */
  rename(oldPath, newPath) {
    if (oldPath === '/' || newPath === '/') {
      console.warn('[VFS] rename: No se puede renombrar la raíz');
      return false;
    }

    const node = this.getNode(oldPath);
    if (!node) {
      console.warn(`[VFS] rename: "${oldPath}" no existe`);
      return false;
    }

    if (this.exists(newPath)) {
      console.warn(`[VFS] rename: "${newPath}" ya existe`);
      return false;
    }

    // Extraer nombre y directorio destino
    const newName = newPath.split('/').filter(Boolean).pop();
    const newParentPath = '/' + newPath.split('/').filter(Boolean).slice(0, -1).join('/');
    const newParent = this.getNode(newParentPath || '/');

    if (!newParent || !newParent.isDirectory()) {
      console.warn(`[VFS] rename: Directorio padre "${newParentPath}" no existe`);
      return false;
    }

    // Remover de padre actual
    const oldParent = node.parent;
    oldParent.removeChild(node.name);

    // Actualizar nombre y añadir a nuevo padre
    node.name = newName;
    node.modifiedAt = Date.now();

    try {
      newParent.addChild(node);
    } catch (err) {
      // Revertir si falla
      node.name = oldPath.split('/').filter(Boolean).pop();
      oldParent.addChild(node);
      console.error(`[VFS] rename error:`, err);
      return false;
    }

    // Actualizar currentFile si era el archivo activo
    if (this._currentFilePath === oldPath) {
      this._currentFilePath = newPath;
    }

    this._persist();
    this._eventBus.emit(VSPenConstants.EVENTS.FILE_RENAMED, {
      oldPath,
      newPath,
      node
    });

    return true;
  }

  /**
   * Eliminar un nodo (archivo o directorio vacío)
   * @param {string} path
   * @returns {boolean}
   */
  delete(path) {
    if (path === '/') {
      console.warn('[VFS] delete: No se puede eliminar la raíz');
      return false;
    }

    const node = this.getNode(path);
    if (!node) {
      console.warn(`[VFS] delete: "${path}" no existe`);
      return false;
    }

    if (node.isDirectory() && node.children.size > 0) {
      console.warn(`[VFS] delete: "${path}" no está vacío`);
      return false;
    }

    const parent = node.parent;
    parent.removeChild(node.name);

    // Si era el archivo activo, limpiar
    if (this._currentFilePath === path) {
      this._currentFilePath = null;
    }

    this._persist();

    const eventType = node.isFile()
      ? VSPenConstants.EVENTS.FILE_DELETED
      : VSPenConstants.EVENTS.DIRECTORY_DELETED;

    this._eventBus.emit(eventType, { path, node });

    return true;
  }

  /**
   * Abrir un archivo (marcar como activo)
   * @param {string} path
   * @returns {boolean}
   */
  openFile(path) {
    const node = this.getNode(path);
    if (!node || !node.isFile()) {
      console.warn(`[VFS] openFile: "${path}" no es un archivo válido`);
      return false;
    }

    this._currentFilePath = path;
    this._persist();

    this._eventBus.emit(VSPenConstants.EVENTS.FILE_OPENED, {
      path,
      content: node.content,
      language: node.detectLanguage(),
      node
    });

    return true;
  }

  // === BULK OPERATIONS ===

  /**
   * Crear estructura de archivos desde objeto plano
   * @param {Object} structure - { "src/app.tsx": "content", "src/styles.css": "..." }
   */
  createFromStructure(structure) {
    for (const [path, content] of Object.entries(structure)) {
      const normalizedPath = path.startsWith('/') ? path : '/' + path;

      // Crear directorios intermedios
      const segments = normalizedPath.split('/').filter(Boolean);
      let currentPath = '';
      for (let i = 0; i < segments.length - 1; i++) {
        currentPath += '/' + segments[i];
        if (!this.exists(currentPath)) {
          this.createDirectory(currentPath);
        }
      }

      // Crear archivo
      if (!this.exists(normalizedPath)) {
        this.createFile(normalizedPath, content);
      }
    }
  }

  /**
   * Exportar todo el árbol como objeto plano
   * @returns {Object} { "/src/app.tsx": "content", ... }
   */
  exportAsFlatObject() {
    const result = {};
    const traverse = (node) => {
      if (node.isFile()) {
        result[node.getPath()] = node.content;
      } else {
        for (const child of node.children.values()) {
          traverse(child);
        }
      }
    };
    traverse(this._root);
    return result;
  }

  /**
   * Resetear VFS a estado inicial
   */
  reset() {
    this._root = new FileNode({ name: '/', type: 'directory' });
    this._currentFilePath = null;
    this._persist();
  }

  // === PRIVATE METHODS ===

  /**
   * Crear nodo asegurando directorios padres
   * @private
   */
  _createNode(path, type, content = '') {
    if (path === '/') {
      return { success: false, node: null, error: 'No se puede crear en raíz directamente' };
    }

    const segments = path.split('/').filter(Boolean);
    const nodeName = segments.pop();
    const parentPath = '/' + segments.join('/');

    // Asegurar que el directorio padre exista
    let parent = this._root;
    let builtPath = '';
    for (const segment of segments) {
      builtPath += '/' + segment;
      let dir = parent.getChild(segment);
      if (!dir) {
        dir = new FileNode({ name: segment, type: 'directory', parent });
        parent.addChild(dir);
      } else if (!dir.isDirectory()) {
        return { success: false, node: null, error: `"${builtPath}" es un archivo, no directorio` };
      }
      parent = dir;
    }

    // Verificar que no exista ya
    if (parent.hasChild(nodeName)) {
      return { success: false, node: null, error: `"${path}" ya existe` };
    }

    // Detectar lenguaje automáticamente
    const tempNode = new FileNode({ name: nodeName, type, content });
    const language = type === 'file' ? tempNode.detectLanguage() : 'plaintext';

    const node = new FileNode({
      name: nodeName,
      type,
      content,
      language,
      parent
    });

    parent.addChild(node);

    return { success: true, node };
  }

  /**
   * Persistir estado en localStorage
   * @private
   */
  _persist() {
    const data = VFSSerializer.serialize(this._root, this._currentFilePath);
    this._storage.set(VSPenConstants.STORAGE.FILES, data.tree);
    this._storage.set(VSPenConstants.STORAGE.CURRENT_FILE, data.currentFile);
  }

  /**
   * Cargar estado desde localStorage
   * @private
   */
  _loadFromStorage() {
    const treeData = this._storage.get(VSPenConstants.STORAGE.FILES, null);
    const currentFile = this._storage.get(VSPenConstants.STORAGE.CURRENT_FILE, null);

    if (treeData) {
      try {
        this._root = VFSSerializer.deserialize(treeData);
        this._currentFilePath = currentFile;
      } catch (err) {
        console.error('[VFS] Error cargando desde storage:', err);
        this._loadDefaults();
      }
    } else {
      this._loadDefaults();
    }
  }

  /**
   * Cargar proyecto por defecto
   * @private
   */
  _loadDefaults() {
    this.createFromStructure({
      'src/app.tsx': [
        '// Bienvenido a VSPen',
        '// Escribe React + TypeScript aquí',
        '',
        'const App = () => {',
        '  const [count, setCount] = React.useState(0);',
        '',
        '  return (',
        '    <div style={{ fontFamily: "system-ui", padding: "40px", textAlign: "center" }}>',
        '      <h1 style={{ fontSize: "2rem", marginBottom: "16px" }}>⚡ VSPen</h1>',
        '      <p style={{ color: "#666", marginBottom: "24px" }}>',
        '        IDE nativo del navegador • Sin npm • Sin backend',
        '      </p>',
        '      <button',
        '        onClick={() => setCount(c => c + 1)}',
        '        style={{',
        '          padding: "12px 32px", fontSize: "1.1rem",',
        '          background: "#007acc", color: "white",',
        '          border: "none", borderRadius: "6px", cursor: "pointer"',
        '        }}',
        '      >',
        '        Clicks: {count}',
        '      </button>',
        '    </div>',
        '  );',
        '};',
        '',
        'const root = ReactDOM.createRoot(document.getElementById("root"));',
        'root.render(<App />);'
      ].join('\n'),
      'src/styles.css': [
        'body {',
        '  margin: 0;',
        '  font-family: system-ui, sans-serif;',
        '}'
      ].join('\n'),
      'index.html': [
        '<!DOCTYPE html>',
        '<html lang="es">',
        '<head>',
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '  <title>Mi App</title>',
        '</head>',
        '<body>',
        '  <div id="root"></div>',
        '</body>',
        '</html>'
      ].join('\n')
    });

    this._currentFilePath = '/src/app.tsx';
    this._persist();
  }
}

if (typeof window !== 'undefined') {
  window.VSPenVirtualFileSystem = VirtualFileSystem;
}