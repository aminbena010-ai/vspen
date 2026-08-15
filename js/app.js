/**
 * ============================================
 * VSPen - Application Bootstrap & Service Wiring
 * Punto de entrada principal: Inicialización ordenada,
 * registro de servicios y conexión de módulos
 * ============================================
 */
(function () {
  "use strict";

  // =============================================
  // 1. REFERENCIAS A MÓDULOS GLOBALES
  // =============================================
  const Constants = window.VSPenConstants;
  const EventBus = window.VSPenEventBus;
  const ServiceRegistry = window.VSPenServiceRegistry;
  const StorageService = window.VSPenStorageService;
  const CommandPalette = window.VSPenCommandPalette;
  const VirtualFileSystem = window.VSPenVirtualFileSystem;
  const FileSystemWatcher = window.VSPenFileSystemWatcher;
  const EditorCore = window.VSPenEditorCore;
  const SyntaxHighlighter = window.VSPenSyntaxHighlighter;
  const LineNumbers = window.VSPenLineNumbers;
  const AutoClosePairs = window.VSPenAutoClosePairs;
  const UndoManager = window.VSPenUndoManager;
  const CompilerService = window.VSPenCompilerService;
  const BabelAdapter = window.VSPenBabelAdapter;
  const ImportResolver = window.VSPenImportResolver;
  const CacheLayer = window.VSPenCacheLayer;
  const ErrorNormalizer = window.VSPenErrorNormalizer;
  const SandboxManager = window.VSPenSandboxManager;
  const PreviewBridge = window.VSPenPreviewBridge;
  const HotReload = window.VSPenHotReload;
  const ComponentSystem = window.VSPenComponentSystem;
  const LayoutEngine = window.VSPenLayoutEngine;
  const ThemeEngine = window.VSPenThemeEngine;
  const IconRegistry = window.VSPenIconRegistry;

  // Referencias a componentes UI
  const TitleBarComponent = window.VSPenTitleBarComponent;
  const ActivityBarComponent = window.VSPenActivityBarComponent;
  const FileExplorerComponent = window.VSPenFileExplorerComponent;
  const TabBarComponent = window.VSPenTabBarComponent;
  const StatusBarComponent = window.VSPenStatusBarComponent;
  const ErrorPanelComponent = window.VSPenErrorPanelComponent;

  // =============================================
  // 2. REGISTRO DE SERVICIOS CORE
  // =============================================
  function registerCoreServices() {
    // EventBus ya existe como singleton global, lo registramos para DI
    ServiceRegistry.register("eventBus", () => EventBus, { singleton: true });

    ServiceRegistry.register(
      "storage",
      (eventBus) => new StorageService(eventBus),
      { singleton: true, deps: ["eventBus"] }
    );

    ServiceRegistry.register(
      "commandPalette",
      (eventBus, storage) => new CommandPalette(eventBus, storage),
      { singleton: true, deps: ["eventBus", "storage"] }
    );
  }

  // =============================================
  // 3. REGISTRO DE SERVICIOS FILESYSTEM
  // =============================================
  function registerFilesystemServices() {
    ServiceRegistry.register(
      "vfs",
      (eventBus, storage) => new VirtualFileSystem(eventBus, storage),
      { singleton: true, deps: ["eventBus", "storage"] }
    );

    ServiceRegistry.register(
      "fsWatcher",
      (eventBus) => new FileSystemWatcher(eventBus),
      { singleton: true, deps: ["eventBus"] }
    );
  }

  // =============================================
  // 4. REGISTRO DE SERVICIOS EDITOR
  // =============================================
  function registerEditorServices() {
    ServiceRegistry.register("syntaxHighlighter", () => new SyntaxHighlighter(), {
      singleton: true,
    });
    ServiceRegistry.register("lineNumbers", () => new LineNumbers(), {
      singleton: true,
    });
    ServiceRegistry.register("autoClosePairs", () => new AutoClosePairs(), {
      singleton: true,
    });
    ServiceRegistry.register("undoManager", () => new UndoManager(), {
      singleton: true,
    });

    ServiceRegistry.register(
      "editor",
      (eventBus) => {
        const editor = new EditorCore(eventBus);

        // Montar sobre elementos DOM existentes
        const textarea = document.getElementById("code-textarea");
        const highlight = document.getElementById("code-highlight");
        const lineNums = document.getElementById("line-numbers");

        if (textarea && highlight) {
          editor.mount({ textarea, highlight, lineNumbers: lineNums });
        }

        // Inyectar sub-módulos
        editor.setModules({
          highlighter: ServiceRegistry.get("syntaxHighlighter"),
          lineNumbers: ServiceRegistry.get("lineNumbers"),
          autoClose: ServiceRegistry.get("autoClosePairs"),
          undoManager: ServiceRegistry.get("undoManager"),
        });

        return editor;
      },
      { singleton: true, deps: ["eventBus"] }
    );
  }

  // =============================================
  // 5. REGISTRO DE SERVICIOS COMPILER
  // =============================================
  function registerCompilerServices() {
    ServiceRegistry.register("cacheLayer", () => new CacheLayer(), {
      singleton: true,
    });
    ServiceRegistry.register("importResolver", () => new ImportResolver(), {
      singleton: true,
    });
    ServiceRegistry.register("errorNormalizer", () => new ErrorNormalizer(), {
      singleton: true,
    });

    ServiceRegistry.register(
      "compiler",
      (eventBus) => {
        const service = new CompilerService(eventBus);

        service.setDependencies({
          cache: ServiceRegistry.get("cacheLayer"),
          resolver: ServiceRegistry.get("importResolver"),
          normalizer: ServiceRegistry.get("errorNormalizer"),
        });

        // Registrar Babel como adapter por defecto
        const babel = new BabelAdapter();
        service.registerAdapter("babel", babel, true);

        return service;
      },
      { singleton: true, deps: ["eventBus"] }
    );
  }

  // =============================================
  // 6. REGISTRO DE SERVICIOS PREVIEW
  // =============================================
  function registerPreviewServices() {
    ServiceRegistry.register(
      "sandbox",
      (eventBus) => {
        const sandbox = new SandboxManager(eventBus);
        const iframe = document.getElementById("preview-frame");
        if (iframe) sandbox.mount(iframe);
        return sandbox;
      },
      { singleton: true, deps: ["eventBus"] }
    );

    ServiceRegistry.register(
      "previewBridge",
      (eventBus, sandbox) => new PreviewBridge(eventBus, sandbox),
      { singleton: true, deps: ["eventBus", "sandbox"] }
    );

    ServiceRegistry.register(
      "hotReload",
      (eventBus, sandbox, bridge) => new HotReload(eventBus, sandbox, bridge),
      { singleton: true, deps: ["eventBus", "sandbox", "previewBridge"] }
    );
  }

  // =============================================
  // 7. REGISTRO DE SERVICIOS UI
  // =============================================
  function registerUIServices() {
    ServiceRegistry.register("componentSystem", () => new ComponentSystem(), {
      singleton: true,
    });
    ServiceRegistry.register(
      "layoutEngine",
      (eventBus, storage) => new LayoutEngine(eventBus, storage),
      { singleton: true, deps: ["eventBus", "storage"] }
    );
    ServiceRegistry.register(
      "themeEngine",
      (eventBus, storage) => new ThemeEngine(eventBus, storage),
      { singleton: true, deps: ["eventBus", "storage"] }
    );
    // Los componentes se renderizan desde funciones globales, por lo que
    // necesitan una instancia (no la clase IconRegistry) disponible al montar.
    const icons = new IconRegistry();
    window.VSPenIcons = icons;
    ServiceRegistry.register("iconRegistry", () => icons, {
      singleton: true,
    });
  }

  // =============================================
  // 8. REGISTRO DE COMPONENTES DECLARATIVOS
  // =============================================
  function registerComponents() {
    const cs = ServiceRegistry.get("componentSystem");

    if (TitleBarComponent) cs.register("title-bar", TitleBarComponent);
    if (ActivityBarComponent) cs.register("activity-bar", ActivityBarComponent);
    if (FileExplorerComponent) cs.register("file-explorer", FileExplorerComponent);
    if (TabBarComponent) cs.register("tab-bar", TabBarComponent);
    if (StatusBarComponent) cs.register("status-bar", StatusBarComponent);
    if (ErrorPanelComponent) cs.register("error-panel", ErrorPanelComponent);
  }

  // =============================================
  // 9. WIRING DE EVENTOS CROSS-MODULE
  // =============================================
  function wireEvents() {
    const eventBus = ServiceRegistry.get("eventBus");
    let compileDebounce = null;

    // Editor → Compiler (auto-compile con debounce)
    eventBus.on(Constants.EVENTS.EDITOR_CONTENT_CHANGED, (data) => {
      clearTimeout(compileDebounce);
      compileDebounce = setTimeout(async () => {
        try {
          const compiler = ServiceRegistry.get("compiler");
          await compiler.compile(data.content, {
            filename: "src/app.tsx",
            language: data.language || "tsx",
          });
        } catch (err) {
          console.error("[App] Compile error:", err);
        }
      }, Constants.COMPILER.DEBOUNCE_MS);
    });

    // Compiler Success → Preview
    eventBus.on(Constants.EVENTS.COMPILE_SUCCESS, async (data) => {
      try {
        const sandbox = ServiceRegistry.get("sandbox");
        const bridge = ServiceRegistry.get("previewBridge");

        // Construir HTML completo del preview
        const cssCode = ""; // En futuro: obtener desde VFS
        const htmlParts = [
          "<!DOCTYPE html><html><head><meta charset='UTF-8'>",
          "<style>" + cssCode + "</style>",
          "</head><body><div id='root'></div>",
          "<scr" + "ipt type='module'>",
          "import React,{useState,useEffect,useRef,useMemo,useCallback} from 'https://esm.sh/react@18.2.0';",
          "import ReactDOM,{createRoot} from 'https://esm.sh/react-dom@18.2.0/client';",
          "window.React=React;window.ReactDOM=ReactDOM;",
          "window.useState=useState;window.useEffect=useEffect;",
          "window.useRef=useRef;window.useMemo=useMemo;window.useCallback=useCallback;",
          "try{",
          data.code,
          "}catch(e){document.getElementById('root').innerHTML='<pre style=\"color:red;padding:20px\">'+e.message+'</pre>';}",
          "</scr" + "ipt></body></html>",
        ];

        await sandbox.loadHTML(htmlParts.join("\n"));

        // Inicializar bridge después de cargar
        if (!bridge.isConnected()) {
          bridge.initializeSandbox();
        }
      } catch (err) {
        console.error("[App] Preview load error:", err);
      }
    });

    // Compiler Error → Error Panel
    eventBus.on(Constants.EVENTS.COMPILE_ERROR, (data) => {
      console.warn("[App] Compilation failed:", data.error?.message);
      // La UI del error panel se actualizará vía componente reactivo
    });

    // Cursor → Status Bar
    eventBus.on(Constants.EVENTS.EDITOR_CURSOR_MOVED, (pos) => {
      const statusEl = document.getElementById("status-position");
      if (statusEl) {
        statusEl.textContent = "Ln " + pos.line + ", Col " + pos.column;
      }
    });

    // File Opened → Editor
    eventBus.on(Constants.EVENTS.FILE_OPENED, (data) => {
      const editor = ServiceRegistry.get("editor");
      if (editor && data.content !== undefined) {
        editor.setContent(data.content);
        editor.setLanguage(data.language || "plaintext");
        editor.focus();
      }
    });

    // Keyboard shortcuts globales
    document.addEventListener("keydown", (e) => {
      // Ctrl+S / Cmd+S → Guardar + Compilar forzado
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        clearTimeout(compileDebounce);
        const editor = ServiceRegistry.get("editor");
        const vfs = ServiceRegistry.get("vfs");
        if (editor && vfs) {
          const content = editor.getContent();
          const currentFile = vfs.getCurrentFile();
          if (currentFile) {
            vfs.writeFile(currentFile, content);
          }
          // Forzar compilación inmediata
          const compiler = ServiceRegistry.get("compiler");
          compiler.compile(content, {
            filename: currentFile || "src/app.tsx",
            language: editor.getLanguage(),
          });
        }
      }
    });
  }

  // =============================================
  // 10. INICIALIZACIÓN DE UI REACTIVA
  // =============================================
  function initUI() {
    const cs = ServiceRegistry.get("componentSystem");
    const vfs = ServiceRegistry.get("vfs");
    const layout = ServiceRegistry.get("layoutEngine");

    // Montar componentes declarativos
    const titleBarEl = document.getElementById("ui-titlebar");
    if (titleBarEl) cs.mount(titleBarEl, "title-bar", { title: "VSPen" });

    const activityBarEl = document.getElementById("ui-activitybar");
    if (activityBarEl) cs.mount(activityBarEl, "activity-bar", { active: "explorer" });

    // File Explorer reactivo
    const explorerEl = document.getElementById("ui-explorer");
    if (explorerEl) {
      const files = vfs.listDirectory("/") || [];
      const explorerInstance = cs.mount(explorerEl, "file-explorer", {
        files: files.map((f) => ({ name: f.name, path: f.getPath(), type: f.type })),
        activeFile: vfs.getCurrentFile(),
      });

      // Actualizar explorer cuando cambien archivos
      ServiceRegistry.get("eventBus").on(Constants.EVENTS.FILE_CREATED, () => {
        const updatedFiles = vfs.listDirectory("/") || [];
        explorerInstance.update({
          files: updatedFiles.map((f) => ({ name: f.name, path: f.getPath(), type: f.type })),
        });
      });
    }

    // Status Bar reactivo
    const statusBarEl = document.getElementById("ui-statusbar");
    if (statusBarEl) {
      cs.mount(statusBarEl, "status-bar", {
        language: "TypeScript React",
        line: 1,
        col: 1,
        errors: 0,
      });
    }

    // Error Panel
    const errorPanelEl = document.getElementById("ui-error-panel");
    if (errorPanelEl) {
      const errorInstance = cs.mount(errorPanelEl, "error-panel", {
        visible: false,
        errors: [],
      });

      ServiceRegistry.get("eventBus").on(Constants.EVENTS.COMPILE_ERROR, (data) => {
        errorInstance.update({
          visible: true,
          errors: [data.error],
        });
      });

      ServiceRegistry.get("eventBus").on(Constants.EVENTS.COMPILE_SUCCESS, () => {
        errorInstance.update({ visible: false, errors: [] });
      });
    }

    // Inicializar resize handles
    const mainResizeHandle = document.getElementById("resize-handle");
    const editorArea = document.querySelector(".editor-area");
    const previewPanel = document.getElementById("preview-panel");
    if (mainResizeHandle && editorArea && previewPanel) {
      layout.initResizeHandle({
        handle: mainResizeHandle,
        primary: editorArea,
        secondary: previewPanel,
        direction: "horizontal",
        storageKey: "editorSplitWidth",
        minPrimary: 200,
      });
    }
  }

  // =============================================
  // 11. BOOTSTRAP PRINCIPAL
  // =============================================
  async function bootstrap() {
    const loadingEl = document.getElementById("loading");

    try {
      console.log("[VSPen] Initializing services...");

      // Fase 1: Core
      registerCoreServices();

      // Fase 2: Filesystem
      registerFilesystemServices();

      // Fase 3: Editor
      registerEditorServices();

      // Fase 4: Compiler
      registerCompilerServices();

      // Fase 5: Preview
      registerPreviewServices();

      // Fase 6: UI Framework
      registerUIServices();

      // Fase 7: Componentes
      registerComponents();

      // Fase 8: Event Wiring
      wireEvents();

      // Fase 9: UI Mounting
      initUI();

      // Fase 10: Cargar archivo inicial en editor
      const vfs = ServiceRegistry.get("vfs");
      const editor = ServiceRegistry.get("editor");
      const currentFile = vfs.getCurrentFile();

      if (currentFile) {
        const content = vfs.readFile(currentFile);
        if (content !== null) {
          editor.setContent(content);
          const node = vfs.getNode(currentFile);
          if (node) editor.setLanguage(node.detectLanguage());
        }
      }

      // Emitir evento de app lista
      ServiceRegistry.get("eventBus").emit(Constants.EVENTS.APP_INITIALIZED);

      // Ocultar loading screen
      if (loadingEl) {
        loadingEl.classList.add("hidden");
        setTimeout(() => loadingEl.remove(), 300);
      }

      console.log("[VSPen] ✓ All services initialized successfully");
      console.log("[VSPen] Registered services:", ServiceRegistry.list());
    } catch (err) {
      console.error("[VSPen] ✗ Bootstrap failed:", err);

      if (loadingEl) {
        loadingEl.innerHTML =
          '<div style="color:#f44747;text-align:center;padding:20px;max-width:500px;">' +
          "<h3>Error al iniciar VSPen</h3>" +
          '<p style="margin-top:12px;font-size:13px;opacity:0.8;">' +
          err.message +
          "</p>" +
          '<button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;' +
          "background:#007acc;color:white;border:none;border-radius:4px;cursor:pointer;\">" +
          "Reintentar</button></div>";
      }
    }
  }

  // =============================================
  // 12. ARRANQUE SEGURO
  // =============================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
