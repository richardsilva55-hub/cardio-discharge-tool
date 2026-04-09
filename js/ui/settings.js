/**
 * Settings modal — customize thresholds and manage overrides.
 */

import { getOverrides, saveOverrides, closeModal } from '../app.js';

export function renderSettings(container) {
  const overrides = getOverrides();

  container.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">Settings</h3>
      <button class="modal-close" id="settingsCloseBtn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Discharge Thresholds</div>

      <div class="setting-row">
        <span class="setting-label">HF: Min EF for discharge (%)</span>
        <div class="setting-value">
          <input type="number" class="setting-input" id="set-hf-ef" value="${overrides['hf-ef-threshold'] || 40}" min="20" max="60">
          <span class="setting-unit">%</span>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">HF: Hospitalization lookback</span>
        <div class="setting-value">
          <input type="number" class="setting-input" id="set-hf-hosp" value="${overrides['hf-hosp-months'] || 12}" min="3" max="24">
          <span class="setting-unit">months</span>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">CAD: Stable symptoms for discharge</span>
        <div class="setting-value">
          <input type="number" class="setting-input" id="set-cad-stable" value="${overrides['cad-stable-months'] || 6}" min="3" max="24">
          <span class="setting-unit">months</span>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">AF: Anticoag stable for discharge</span>
        <div class="setting-value">
          <input type="number" class="setting-input" id="set-af-anticoag" value="${overrides['af-anticoag-months'] || 6}" min="3" max="24">
          <span class="setting-unit">months</span>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">HTN: BP at goal for discharge</span>
        <div class="setting-value">
          <input type="number" class="setting-input" id="set-htn-goal" value="${overrides['htn-goal-months'] || 6}" min="3" max="24">
          <span class="setting-unit">months</span>
        </div>
      </div>

      <div class="setting-row">
        <span class="setting-label">Syncope: Recurrence-free period</span>
        <div class="setting-value">
          <input type="number" class="setting-input" id="set-syncope-free" value="${overrides['syncope-free-months'] || 6}" min="3" max="24">
          <span class="setting-unit">months</span>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">Data Management</div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button class="btn btn-secondary btn-full" id="exportOverridesBtn">Export Custom Rules</button>
        <label class="btn btn-secondary btn-full" style="cursor: pointer; text-align: center;">
          Import Custom Rules
          <input type="file" accept=".json" id="importOverridesInput" style="display: none;">
        </label>
        <button class="btn btn-ghost btn-full" id="resetOverridesBtn" style="color: var(--color-red);">Reset to Defaults</button>
      </div>
    </div>
  `;

  // Close button
  container.querySelector('#settingsCloseBtn').addEventListener('click', closeModal);

  // Save on change
  const inputs = container.querySelectorAll('.setting-input');
  inputs.forEach(input => {
    input.addEventListener('change', () => {
      const newOverrides = getOverrides();
      newOverrides['hf-ef-threshold'] = Number(container.querySelector('#set-hf-ef').value);
      newOverrides['hf-hosp-months'] = Number(container.querySelector('#set-hf-hosp').value);
      newOverrides['cad-stable-months'] = Number(container.querySelector('#set-cad-stable').value);
      newOverrides['af-anticoag-months'] = Number(container.querySelector('#set-af-anticoag').value);
      newOverrides['htn-goal-months'] = Number(container.querySelector('#set-htn-goal').value);
      newOverrides['syncope-free-months'] = Number(container.querySelector('#set-syncope-free').value);
      saveOverrides(newOverrides);
    });
  });

  // Export overrides
  container.querySelector('#exportOverridesBtn').addEventListener('click', () => {
    const data = JSON.stringify(getOverrides(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cardio-discharge-overrides.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import overrides
  container.querySelector('#importOverridesInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      saveOverrides(data);
      closeModal();
    } catch {
      alert('Invalid JSON file');
    }
  });

  // Reset
  container.querySelector('#resetOverridesBtn').addEventListener('click', () => {
    if (confirm('Reset all custom thresholds to defaults?')) {
      localStorage.removeItem('cardio-overrides');
      closeModal();
    }
  });
}
