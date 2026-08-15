/**
 * FILE EXPLORER COMPONENT
 */
function FileExplorerComponent(props, state, update) {
  const icons = props && props.icons;
  if (!icons || typeof icons.get !== 'function') {
    throw new Error('FileExplorerComponent requires props.icons with a get() method');
  }
  const files = props.files || [];
  const activeFile = props.activeFile || '';
  
  const getIconForFile = (name) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return 'file-ts';
    if (name.endsWith('.jsx') || name.endsWith('.js')) return 'file-js';
    if (name.endsWith('.css')) return 'file-css';
    if (name.endsWith('.html')) return 'file-html';
    return 'file-generic';
  };
  
  const fileItems = files.map(file => `
    <div class="file-item ${file.path === activeFile ? 'active' : ''}" 
         data-path="${file.path}">
      <span class="file-item__icon">${icons.get(getIconForFile(file.name), 16)}</span>
      <span class="file-item__name truncate">${file.name}</span>
    </div>
  `).join('');
  
  return `
    <div class="sidebar">
      <div class="sidebar__header">EXPLORADOR</div>
      <div class="sidebar__content">
        ${fileItems || '<div style="padding:12px;color:var(--fg-muted);font-size:12px;">Sin archivos</div>'}
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.VSPenFileExplorerComponent = FileExplorerComponent;
}
