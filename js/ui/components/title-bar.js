/**
 * TITLE BAR COMPONENT
 */
function TitleBarComponent(props, state, update) {
  const icons = window.VSPenIcons;
  
  return `
    <div class="titlebar">
      <div class="titlebar__logo">
        ${icons.get('explorer', 16)}
        <span>VSPen</span>
      </div>
      <div class="titlebar__menu">
        <span class="titlebar__menu-item">Archivo</span>
        <span class="titlebar__menu-item">Editar</span>
        <span class="titlebar__menu-item">Ver</span>
        <span class="titlebar__menu-item">Ayuda</span>
      </div>
      <div class="titlebar__title">${props.title || 'VSPen'}</div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.VSPenTitleBarComponent = TitleBarComponent;
}
