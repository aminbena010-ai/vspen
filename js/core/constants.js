/**
 * ============================================
 * CONSTANTS - Eventos, Tipos, Claves
 * Sin magic strings en todo el proyecto
 * ============================================
 */

const VSPenConstants = Object.freeze({
  // === EVENT BUS EVENTS ===
  EVENTS: Object.freeze({
    // File System
    FILE_CREATED: 'fs:file-created',
    FILE_UPDATED: 'fs:file-updated',
    FILE_DELETED: 'fs:file-deleted',
    FILE_RENAMED: 'fs:file-renamed',
    FILE_OPENED: 'fs:file-opened',
    FILE_SAVED: 'fs:file-saved',
    DIRECTORY_CREATED: 'fs:dir-created',
    DIRECTORY_DELETED: 'fs:dir-deleted',

    // Editor
    EDITOR_CONTENT_CHANGED: 'editor:content-changed',
    EDITOR_CURSOR_MOVED: 'editor:cursor-moved',
    EDITOR_SELECTION_CHANGED: 'editor:selection-changed',
    EDITOR_LANGUAGE_CHANGED: 'editor:language-changed',
    EDITOR_READY: 'editor:ready',

    // Compiler
    COMPILE_STARTED: 'compiler:started',
    COMPILE_SUCCESS: 'compiler:success',
    COMPILE_ERROR: 'compiler:error',
    COMPILE_CACHE_HIT: 'compiler:cache-hit',

    // Preview
    PREVIEW_READY: 'preview:ready',
    PREVIEW_ERROR: 'preview:error',
    PREVIEW_MESSAGE: 'preview:message',

    // UI / Layout
    TAB_ACTIVATED: 'ui:tab-activated',
    TAB_CLOSED: 'ui:tab-closed',
    SIDEBAR_TOGGLED: 'ui:sidebar-toggled',
    THEME_CHANGED: 'ui:theme-changed',
    LAYOUT_RESIZED: 'ui:layout-resized',
    MODAL_OPENED: 'ui:modal-opened',
    MODAL_CLOSED: 'ui:modal-closed',
    TOAST_SHOWN: 'ui:toast-shown',

    // App Lifecycle
    APP_INITIALIZED: 'app:initialized',
    APP_BEFORE_UNLOAD: 'app:before-unload',
    STORAGE_MIGRATED: 'storage:migrated'
  }),

  // === STORAGE KEYS ===
  STORAGE: Object.freeze({
    PREFIX: 'vspen:',
    FILES: 'vspen:files',
    CURRENT_FILE: 'vspen:current-file',
    SETTINGS: 'vspen:settings',
    LAYOUT_STATE: 'vspen:layout-state',
    RECENT_FILES: 'vspen:recent-files',
    COMMAND_HISTORY: 'vspen:command-history',
    VERSION: 'vspen:version',
    THEME: 'vspen:theme'
  }),

  // === FILE TYPES & LANGUAGES ===
  LANGUAGES: Object.freeze({
    TYPESCRIPT: 'typescript',
    JAVASCRIPT: 'javascript',
    TSX: 'tsx',
    JSX: 'jsx',
    CSS: 'css',
    HTML: 'html',
    JSON: 'json',
    MARKDOWN: 'markdown',
    PLAIN: 'plaintext'
  }),

  FILE_EXTENSIONS: Object.freeze({
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.css': 'css',
    '.html': 'html',
    '.json': 'json',
    '.md': 'markdown',
    '.txt': 'plaintext'
  }),

  // === COMPILER ===
  COMPILER: Object.freeze({
    DEBOUNCE_MS: 500,
    CACHE_MAX_SIZE: 50,
    BABEL_PRESETS: ['react', 'typescript'],
    ESM_CDN_BASE: 'https://esm.sh',
    REACT_VERSION: '18.2.0',
    REACT_DOM_VERSION: '18.2.0'
  }),

  // === EDITOR ===
  EDITOR: Object.freeze({
    TAB_SIZE: 2,
    FONT_SIZE_DEFAULT: 13,
    FONT_SIZE_MIN: 10,
    FONT_SIZE_MAX: 24,
    UNDO_STACK_LIMIT: 100,
    AUTO_SAVE_DEBOUNCE_MS: 1000,
    LINE_HEIGHT: 20
  }),

  // === LAYOUT ===
  LAYOUT: Object.freeze({
    SIDEBAR_WIDTH_DEFAULT: 260,
    SIDEBAR_WIDTH_MIN: 180,
    SIDEBAR_WIDTH_MAX: 500,
    EDITOR_MIN_PERCENT: 20,
    EDITOR_MAX_PERCENT: 80,
    PANEL_COLLAPSED_WIDTH: 0
  }),

  // === APP METADATA ===
  APP: Object.freeze({
    NAME: 'VSPen',
    VERSION: '1.0.0',
    STORAGE_SCHEMA_VERSION: 1
  })
});

// Exportar como global accesible dentro del IIFE
if (typeof window !== 'undefined') {
  window.VSPenConstants = VSPenConstants;
}