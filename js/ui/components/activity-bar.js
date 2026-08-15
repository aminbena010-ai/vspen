/**
 * ACTIVITY BAR COMPONENT
 */
function ActivityBarComponent(props, state, update) {
  const icons = window.VSPenIconRegistry;
  const active = props.active || 'explorer';
  
  const items = [
    { id: 'explorer', icon: 'explorer', title: 'Explorador' },
    { id: 'search', icon: 'search', title: 'Buscar' },
    { id: 'git', icon: 'git', title: 'Control de Código Fuente' },
  ];
  
  const bottomItems = [
    { id: 'settings', icon: 'settings', title: 'Configuración' }
  ];
  
  const renderItem = (item) => `
    <div class="activitybar__icon ${active === item.id ? 'active' : ''}" 
         data-id="${item.id}" title="${item.title}">
      ${icons.get(item.icon, 24)}
    </div>
  `;
  
  return `
    <div class="activitybar">
      ${items.map(renderItem).join('')}
      <div class="activitybar__spacer"></div>
      ${bottomItems.map(renderItem).join('')}
    </div>
  `;
}

if (typeof window !== 'undefined') {
  window.VSPenActivityBarComponent = ActivityBarComponent;
}