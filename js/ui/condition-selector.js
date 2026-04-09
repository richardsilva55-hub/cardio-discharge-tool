/**
 * Condition Selector — grid of condition cards with search and multi-select.
 */

// SVG icons for each condition category
const icons = {
  'heart-failure': '<path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>',
  'cad-pci': '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>',
  'post-cabg': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'valvular': '<circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/>',
  'afib-flutter': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'other-arrhythmias': '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h2l2-3 2 6 2-3h2"/>',
  'hypertension': '<path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="8"/>',
  'hcm': '<path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/><path d="M12 8v8"/>',
  'dcm': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>',
  'pulmonary-htn': '<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v12M8 10l4-4 4 4"/>',
  'adult-congenital': '<path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/><circle cx="12" cy="11" r="2"/>',
  'pericardial': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" stroke-dasharray="4 2"/>',
  'syncope': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 8v4l3 3"/>',
  'aortic-disease': '<path d="M12 2v20"/><path d="M8 6c0 0 0-2 4-2s4 2 4 2"/><path d="M6 10c0 0 0-2 6-2s6 2 6 2"/><path d="M8 18c0 0 0 2 4 2s4-2 4-2"/>'
};

export function renderConditionSelector(conditions, selectedIds, callbacks) {
  const screen = document.createElement('div');
  screen.className = 'screen';

  // Header
  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <h2 class="screen-title">Select Condition</h2>
    <p class="screen-subtitle">Choose one or more active cardiology conditions for this patient</p>
  `;
  screen.appendChild(header);

  // Search
  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'search-wrapper';
  searchWrapper.innerHTML = `
    <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
  `;
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search conditions...';
  searchInput.setAttribute('aria-label', 'Search conditions');
  searchWrapper.appendChild(searchInput);
  screen.appendChild(searchWrapper);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'condition-grid';

  const cards = [];
  for (const condition of conditions) {
    const card = document.createElement('button');
    card.className = 'condition-card' + (selectedIds.includes(condition.id) ? ' selected' : '');
    card.setAttribute('aria-pressed', selectedIds.includes(condition.id));
    card.dataset.id = condition.id;
    card.dataset.searchText = `${condition.name} ${condition.description || ''}`.toLowerCase();

    const iconSvg = icons[condition.id] || icons['heart-failure'];
    card.innerHTML = `
      <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>
      <span class="card-name">${condition.name}</span>
      <span class="card-desc">${condition.shortDesc || ''}</span>
    `;

    card.addEventListener('click', () => callbacks.onToggle(condition.id));
    grid.appendChild(card);
    cards.push(card);
  }
  screen.appendChild(grid);

  // Search filtering
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    for (const card of cards) {
      if (!query || card.dataset.searchText.includes(query)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    }
  });

  // Continue button
  const continueBtn = document.createElement('button');
  continueBtn.className = 'btn btn-primary btn-full';
  continueBtn.textContent = 'Continue';
  continueBtn.disabled = selectedIds.length === 0;
  continueBtn.addEventListener('click', callbacks.onContinue);
  screen.appendChild(continueBtn);

  // Focus search on mount
  requestAnimationFrame(() => searchInput.focus());

  return screen;
}
