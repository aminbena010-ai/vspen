/**
 * ============================================
 * FILE NODE - Estructura Árbol (Carpetas + Archivos)
 * Representación inmutable-safe de nodos del VFS
 * ============================================
 */

class FileNode {
  /**
   * @param {Object} options
   * @param {string} options.name - Nombre del archivo/carpeta
   * @param {'file'|'directory'} options.type - Tipo de nodo
   * @param {string} [options.content=''] - Contenido (solo archivos)
   * @param {string} [options.language='plaintext'] - Lenguaje detectado
   * @param {number} [options.createdAt] - Timestamp creación
   * @param {number} [options.modifiedAt] - Timestamp modificación
   * @param {FileNode|null} [options.parent=null] - Referencia al padre
   */
  constructor({ name, type, content = '', language = 'plaintext', createdAt, modifiedAt, parent = null }) {
    if (!name || typeof name !== 'string') {
      throw new Error('FileNode: name es obligatorio y debe ser string');
    }
    if (type !== 'file' && type !== 'directory') {
      throw new Error(`FileNode: type debe ser "file" o "directory", recibido "${type}"`);
    }

    this.name = name;
    this.type = type;
    this.content = type === 'file' ? String(content) : '';
    this.language = language;
    this.createdAt = createdAt || Date.now();
    this.modifiedAt = modifiedAt || this.createdAt;
    this.parent = parent;

    /** @type {Map<string, FileNode>} Hijos ordenados por nombre */
    this.children = new Map();

    // Congelar estructura básica para prevenir mutaciones accidentales
    // (los hijos y contenido siguen siendo mutables intencionalmente)
    Object.defineProperty(this, '_isFileNode', { value: true, enumerable: false });
  }

  /**
   * Verificar si es archivo
   * @returns {boolean}
   */
  isFile() {
    return this.type === 'file';
  }

  /**
   * Verificar si es directorio
   * @returns {boolean}
   */
  isDirectory() {
    return this.type === 'directory';
  }

  /**
   * Obtener ruta absoluta desde la raíz
   * @returns {string} Ej: "/src/components/Button.tsx"
   */
  getPath() {
    const parts = [];
    let node = this;
    while (node && node.parent) {
      parts.unshift(node.name);
      node = node.parent;
    }
    return '/' + parts.join('/');
  }

  /**
   * Obtener extensión del archivo
   * @returns {string} Ej: ".tsx" o "" si no tiene
   */
  getExtension() {
    if (!this.isFile()) return '';
    const dotIndex = this.name.lastIndexOf('.');
    return dotIndex > 0 ? this.name.substring(dotIndex) : '';
  }

  /**
   * Detectar lenguaje basado en extensión
   * @returns {string}
   */
  detectLanguage() {
    if (!this.isFile()) return 'plaintext';
    const ext = this.getExtension();
    const langMap = VSPenConstants.FILE_EXTENSIONS;
    return langMap[ext] || 'plaintext';
  }

  /**
   * Añadir hijo a un directorio
   * @param {FileNode} child
   * @throws Error si no es directorio o nombre duplicado
   */
  addChild(child) {
    if (!this.isDirectory()) {
      throw new Error(`FileNode.addChild: "${this.name}" no es un directorio`);
    }
    if (this.children.has(child.name)) {
      throw new Error(`FileNode.addChild: Ya existe "${child.name}" en "${this.getPath()}"`);
    }

    child.parent = this;
    this.children.set(child.name, child);
    this.modifiedAt = Date.now();
  }

  /**
   * Eliminar hijo de un directorio
   * @param {string} name
   * @returns {FileNode|null} Nodo eliminado o null
   */
  removeChild(name) {
    if (!this.isDirectory()) return null;
    const child = this.children.get(name);
    if (child) {
      child.parent = null;
      this.children.delete(name);
      this.modifiedAt = Date.now();
    }
    return child || null;
  }

  /**
   * Obtener hijo por nombre
   * @param {string} name
   * @returns {FileNode|undefined}
   */
  getChild(name) {
    return this.children.get(name);
  }

  /**
   * Verificar si existe un hijo
   * @param {string} name
   * @returns {boolean}
   */
  hasChild(name) {
    return this.children.has(name);
  }

  /**
   * Obtener todos los hijos como array ordenado
   * Directorios primero, luego archivos, ambos alfabéticos
   * @returns {FileNode[]}
   */
  getSortedChildren() {
    const dirs = [];
    const files = [];

    for (const child of this.children.values()) {
      if (child.isDirectory()) dirs.push(child);
      else files.push(child);
    }

    dirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    return [...dirs, ...files];
  }

  /**
   * Buscar nodo por ruta relativa desde este nodo
   * @param {string} path - Ej: "components/Button.tsx"
   * @returns {FileNode|null}
   */
  resolve(path) {
    if (!path || path === '.' || path === '') return this;

    const normalized = path.replace(/^\/+/, '').replace(/\/+$/, '');
    const segments = normalized.split('/').filter(Boolean);

    let current = this;
    for (const segment of segments) {
      if (!current.isDirectory()) return null;
      current = current.getChild(segment);
      if (!current) return null;
    }

    return current;
  }

  /**
   * Obtener tamaño del contenido en bytes (aproximado)
   * @returns {number}
   */
  getSizeBytes() {
    if (this.isFile()) {
      return new TextEncoder().encode(this.content).length;
    }
    let total = 0;
    for (const child of this.children.values()) {
      total += child.getSizeBytes();
    }
    return total;
  }

  /**
   * Contar nodos recursivamente
   * @returns {{files: number, directories: number}}
   */
  countRecursive() {
    let files = this.isFile() ? 1 : 0;
    let directories = this.isDirectory() ? 1 : 0;

    for (const child of this.children.values()) {
      const sub = child.countRecursive();
      files += sub.files;
      directories += sub.directories;
    }

    return { files, directories };
  }

  /**
   * Crear clon profundo del nodo (sin referencia al padre)
   * @returns {FileNode}
   */
  deepClone() {
    const clone = new FileNode({
      name: this.name,
      type: this.type,
      content: this.content,
      language: this.language,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
      parent: null
    });

    for (const [name, child] of this.children) {
      const childClone = child.deepClone();
      clone.addChild(childClone);
    }

    return clone;
  }
}

if (typeof window !== 'undefined') {
  window.VSPenFileNode = FileNode;
}