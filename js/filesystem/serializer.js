/**
 * ============================================
 * SERIALIZER - JSON Safe Serialize/Deserialize
 * Conversión segura entre FileNode tree ↔ JSON plano
 * ============================================
 */

const VFSSerializer = {
  /**
   * Serializar árbol de FileNode a formato JSON seguro
   * @param {FileNode} root - Nodo raíz
   * @param {string|null} currentFile - Ruta del archivo activo
   * @returns {{tree: Object, currentFile: string|null}}
   */
  serialize(root, currentFile) {
    return {
      tree: this._serializeNode(root),
      currentFile: currentFile || null
    };
  },

  /**
   * Deserializar JSON a árbol de FileNode
   * @param {Object} data - Datos serializados
   * @returns {FileNode} Nodo raíz reconstruido
   */
  deserialize(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('VFSSerializer.deserialize: datos inválidos');
    }

    return this._deserializeNode(data, null);
  },

  /**
   * Validar integridad de datos serializados
   * @param {Object} data
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      errors.push('Datos no son un objeto válido');
      return { valid: false, errors };
    }

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Falta campo "name" en nodo raíz');
    }

    if (data.type !== 'directory') {
      errors.push('Nodo raíz debe ser tipo "directory"');
    }

    if (data.children && !Array.isArray(data.children)) {
      errors.push('Campo "children" debe ser array');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Obtener tamaño estimado del JSON serializado
   * @param {FileNode} root
   * @returns {number} Bytes aproximados
   */
  estimateSize(root) {
    const serialized = this.serialize(root, null);
    return new TextEncoder().encode(JSON.stringify(serialized)).length;
  },

  // === PRIVATE METHODS ===

  /**
   * @private
   */
  _serializeNode(node) {
    const obj = {
      name: node.name,
      type: node.type,
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt
    };

    if (node.isFile()) {
      obj.content = node.content;
      obj.language = node.language;
    } else {
      obj.children = [];
      // Mantener orden: directorios primero, luego archivos
      const sorted = node.getSortedChildren();
      for (const child of sorted) {
        obj.children.push(this._serializeNode(child));
      }
    }

    return obj;
  },

  /**
   * @private
   */
  _deserializeNode(data, parent) {
    // Validación básica de cada nodo
    if (!data.name || !data.type) {
      throw new Error('VFSSerializer: nodo sin name o type');
    }

    const node = new FileNode({
      name: data.name,
      type: data.type,
      content: data.content || '',
      language: data.language || 'plaintext',
      createdAt: data.createdAt,
      modifiedAt: data.modifiedAt,
      parent
    });

    if (data.type === 'directory' && Array.isArray(data.children)) {
      for (const childData of data.children) {
        try {
          const childNode = this._deserializeNode(childData, node);
          node.addChild(childNode);
        } catch (err) {
          console.warn(`[VFSSerializer] Saltando nodo inválido:`, err.message);
        }
      }
    }

    return node;
  }
};

if (typeof window !== 'undefined') {
  window.VSPenVFSSerializer = VFSSerializer;
}