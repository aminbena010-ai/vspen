/**
 * STATUS BAR COMPONENT
 */
function StatusBarComponent(props, state, update) {
  const icons = window.VSPenIcons;
  
  return `
    <div class="statusbar">
      <div class="statusbar__left">
        <div class="statusbar__item">${icons.get('git', 12)} main</div>
        <div class="statusbar__item">${props.errors || 0} errores</div>
      </div>
      <div class="statusbar__right">
        <div class="statusbar__item">${props.language || 'TypeScript React'}</div>
        <div class="statusbar__item">Ln ${props.line || 1}, Col ${props.col || 1}</div>
        <div class="statusbar__item">UTF-8</div>
        <div class="statusbar__item">VSPen v1.0</div>
      </div>
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.VSPenStatusBarComponent = StatusBarComponent;
}
