/**
 * CardioDischarge — Main application controller.
 * Hash-based routing: #select, #subtype, #questionnaire, #result
 */

import { renderConditionSelector } from './ui/condition-selector.js';
import { renderQuestionnaire } from './ui/questionnaire.js';
import { renderRecommendation } from './ui/recommendation.js';
import { renderSettings } from './ui/settings.js';

// ===== Application State =====
const state = {
  selectedConditions: [],  // Array of condition IDs
  currentCondition: null,  // { id, name, data } — the condition being assessed
  currentSubtype: null,    // { id, name, sections, rules }
  answers: {},             // { conditionId: { questionId: value } }
  results: [],             // Array of per-condition results
  currentStep: 0           // Current questionnaire section index
};

const app = document.getElementById('app');
const settingsBtn = document.getElementById('settingsBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');

// ===== Condition Registry Cache =====
let conditionsRegistry = null;
const rulesCache = {};

async function loadConditions() {
  if (conditionsRegistry) return conditionsRegistry;
  const resp = await fetch('data/conditions.json');
  conditionsRegistry = await resp.json();
  return conditionsRegistry;
}

async function loadRules(conditionId) {
  if (rulesCache[conditionId]) return rulesCache[conditionId];
  const registry = await loadConditions();
  const condition = registry.conditions.find(c => c.id === conditionId);
  if (!condition) throw new Error(`Unknown condition: ${conditionId}`);
  const resp = await fetch(`data/rules/${condition.rulesFile}`);
  const data = await resp.json();
  rulesCache[conditionId] = data;
  return data;
}

// ===== Custom Overrides from localStorage =====
export function getOverrides() {
  try {
    return JSON.parse(localStorage.getItem('cardio-overrides') || '{}');
  } catch {
    return {};
  }
}

export function saveOverrides(overrides) {
  localStorage.setItem('cardio-overrides', JSON.stringify(overrides));
}

// ===== Routing =====
function route() {
  const hash = window.location.hash || '#select';

  switch (hash) {
    case '#select':
      showConditionSelector();
      break;
    case '#subtype':
      showSubtypeSelector();
      break;
    case '#questionnaire':
      showQuestionnaire();
      break;
    case '#result':
      showResult();
      break;
    default:
      showConditionSelector();
  }
}

async function showConditionSelector() {
  const registry = await loadConditions();
  app.innerHTML = '';
  const screen = renderConditionSelector(registry.conditions, state.selectedConditions, {
    onToggle(conditionId) {
      const idx = state.selectedConditions.indexOf(conditionId);
      if (idx >= 0) {
        state.selectedConditions.splice(idx, 1);
      } else {
        state.selectedConditions.push(conditionId);
      }
      showConditionSelector();
    },
    onContinue() {
      // Start evaluating the first selected condition
      state.results = [];
      state.currentStep = 0;
      processNextCondition(0);
    }
  });
  app.appendChild(screen);
}

async function processNextCondition(index) {
  if (index >= state.selectedConditions.length) {
    // All conditions assessed — show results
    window.location.hash = '#result';
    return;
  }

  const conditionId = state.selectedConditions[index];
  const registry = await loadConditions();
  const conditionMeta = registry.conditions.find(c => c.id === conditionId);
  const rules = await loadRules(conditionId);

  state.currentCondition = {
    id: conditionId,
    name: conditionMeta.name,
    data: rules,
    index: index
  };

  if (!state.answers[conditionId]) {
    state.answers[conditionId] = {};
  }

  // Check for subtypes
  if (rules.subtypes && rules.subtypes.length > 1) {
    window.location.hash = '#subtype';
  } else {
    // Single type or no subtypes
    const subtype = rules.subtypes ? rules.subtypes[0] : rules;
    state.currentSubtype = {
      id: subtype.id || conditionId,
      name: subtype.name || conditionMeta.name,
      sections: subtype.sections,
      rules: subtype.rules
    };
    state.currentStep = 0;
    window.location.hash = '#questionnaire';
  }
}

function showSubtypeSelector() {
  const { currentCondition } = state;
  if (!currentCondition) { window.location.hash = '#select'; return; }

  app.innerHTML = '';
  const screen = document.createElement('div');
  screen.className = 'screen';

  const header = document.createElement('div');
  header.className = 'screen-header';
  header.innerHTML = `
    <h2 class="screen-title">${currentCondition.name}</h2>
    <p class="screen-subtitle">Select the specific type</p>
  `;
  screen.appendChild(header);

  const list = document.createElement('div');
  list.className = 'subtype-list';

  for (const subtype of currentCondition.data.subtypes) {
    const option = document.createElement('button');
    option.className = 'subtype-option';
    option.innerHTML = `
      <div>
        <div class="subtype-name">${subtype.name}</div>
        ${subtype.description ? `<div class="subtype-desc">${subtype.description}</div>` : ''}
      </div>
      <svg class="subtype-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    `;
    option.addEventListener('click', () => {
      state.currentSubtype = {
        id: subtype.id,
        name: subtype.name,
        sections: subtype.sections,
        rules: subtype.rules
      };
      state.currentStep = 0;
      window.location.hash = '#questionnaire';
    });
    list.appendChild(option);
  }

  screen.appendChild(list);

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => {
    window.location.hash = '#select';
  });
  screen.appendChild(backBtn);

  app.appendChild(screen);
}

function showQuestionnaire() {
  const { currentCondition, currentSubtype } = state;
  if (!currentCondition || !currentSubtype) { window.location.hash = '#select'; return; }

  const conditionId = currentCondition.id;
  const answers = state.answers[conditionId] || {};

  app.innerHTML = '';
  const screen = renderQuestionnaire({
    conditionName: currentCondition.name,
    subtypeName: currentSubtype.name,
    sections: currentSubtype.sections,
    currentStep: state.currentStep,
    answers: answers,
    conditionId: conditionId,
    onAnswer(questionId, value) {
      if (!state.answers[conditionId]) state.answers[conditionId] = {};
      state.answers[conditionId][questionId] = value;
    },
    onStepChange(step) {
      state.currentStep = step;
      showQuestionnaire();
    },
    onComplete() {
      // This condition is done — store and move to next
      const { buildRecommendation } = window._recBuilder;
      const result = buildRecommendation([{
        conditionId: conditionId,
        conditionName: currentCondition.name,
        subtypeId: currentSubtype.id,
        subtypeName: currentSubtype.name,
        rules: currentSubtype.rules,
        answers: state.answers[conditionId]
      }]);
      state.results.push({
        conditionId,
        conditionName: currentCondition.name,
        subtypeName: currentSubtype.name,
        result
      });
      processNextCondition(currentCondition.index + 1);
    },
    onBack() {
      if (currentCondition.data.subtypes && currentCondition.data.subtypes.length > 1) {
        window.location.hash = '#subtype';
      } else {
        window.location.hash = '#select';
      }
    }
  });
  app.appendChild(screen);
}

function showResult() {
  if (state.results.length === 0) { window.location.hash = '#select'; return; }

  app.innerHTML = '';
  const screen = renderRecommendation({
    results: state.results,
    onEditAnswers() {
      // Go back to first condition questionnaire
      state.currentStep = 0;
      processNextCondition(0);
    },
    onNewPatient() {
      state.selectedConditions = [];
      state.answers = {};
      state.results = [];
      state.currentStep = 0;
      state.currentCondition = null;
      state.currentSubtype = null;
      window.location.hash = '#select';
    }
  });
  app.appendChild(screen);
  injectSignature(app);
}

// ===== Modal Helpers =====
export function openModal(contentFn) {
  modal.innerHTML = '';
  contentFn(modal);
  modalOverlay.classList.add('active');
}

export function closeModal() {
  modalOverlay.classList.remove('active');
}

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ===== Settings Button =====
settingsBtn.addEventListener('click', () => {
  openModal((container) => {
    renderSettings(container);
  });
});

// ===== Init =====
// Make recommendation builder available globally for the questionnaire callback
import { buildRecommendation } from './engine/recommendation-builder.js';
window._recBuilder = { buildRecommendation };

window.addEventListener('hashchange', route);
route();

function injectSignature(container) {
  const footer = document.createElement('footer');
  footer.className = 'app-signature';
  footer.innerHTML = `
    <span class="signature-text">Designed & Developed by</span>
    <span class="signature-credit">RSC, MD</span>
    <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 8px;">
      Board-Certified Cardiac Electrophysiologist
    </p>
  `;
  container.appendChild(footer);
}
