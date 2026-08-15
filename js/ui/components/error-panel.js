/**
 * ERROR PANEL COMPONENT
 */
function ErrorPanelComponent(props, state, update) {
  const isVisible = props.visible || false;
  const errors = props.errors || [];
  
  const errorItems = errors.map(err => 
    `<div class="error-panel__body">${err.message || String(err)}</div>`
  ).join('');
  
  return `
    <div class="error-panel ${isVisible ? 'visible' : ''}">
      <div class="error-panel__header">
        <span>PROBLEMAS (${errors.length})</span>
        <span class="error-panel__close" data-action="close">✕</span>
      </div>
      ${errorItems || '<div class="error-panel__body" style="opacity:0.6">Sin problemas detectados</div>'}
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.VSPenErrorPanelComponent = ErrorPanelComponent;
}