/**
 * TAB BAR COMPONENT
 */
function TabBarComponent(props, state, update) {
  const icons = window.VSPenIcons;
  const tabs = props.tabs || [];
  const activeTab = props.activeTab || '';
  
  const tabItems = tabs.map(tab => `
    <div class="tab ${tab.path === activeTab ? 'active' : ''}" data-path="${tab.path}">
      <span class="truncate">${tab.name}</span>
      <span class="tab__close" data-close="${tab.path}">${icons.get('close', 14)}</span>
    </div>
  `).join('');
  
  return `<div class="tab-bar">${tabItems}</div>`;
}

if (typeof window !== 'undefined') {
  window.VSPenTabBarComponent = TabBarComponent;
}
