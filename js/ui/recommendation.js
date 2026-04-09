/**
 * Recommendation screen — displays results with traffic-light banner,
 * expandable sections, risk scores, and export actions.
 */

import { printSummary, downloadSummary, copyToClipboard } from '../utils/export.js';
import { evaluateMultipleConditions } from '../engine/decision-engine.js';
import { openModal, closeModal } from '../app.js';

export function renderRecommendation(config) {
  const { results, onEditAnswers, onNewPatient } = config;

  // Merge results across conditions
  const allConditionResults = results.map(r => r.result);
  let final;
  if (allConditionResults.length === 1) {
    final = allConditionResults[0];
  } else {
    // Re-evaluate with most conservative logic
    const flatResults = allConditionResults.map(r => ({
      recommendation: r.recommendation,
      interval: r.interval,
      reasons: r.reasons || [],
      precautions: r.precautions || [],
      conditionName: r.conditionResults?.[0]?.conditionName || '',
      subtypeName: r.conditionResults?.[0]?.subtypeName || '',
      scores: r.scores || []
    }));
    final = evaluateMultipleConditions(flatResults);
    final.scores = allConditionResults.flatMap(r => r.scores || []);
    final.summary = allConditionResults.map(r => r.summary).join('\n\n---\n\n');
  }

  // Build summary text
  const summaryText = final.summary || buildQuickSummary(final, results);

  const screen = document.createElement('div');
  screen.className = 'screen';

  // Result banner
  const bannerClass = final.recommendation === 'discharge' ? 'discharge'
    : final.recommendation === 'closer' ? 'closer'
    : 'continue';

  const bannerIcon = final.recommendation === 'discharge'
    ? '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
    : final.recommendation === 'closer'
    ? '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>';

  const bannerTitle = final.recommendation === 'discharge'
    ? 'Safe to Discharge to PCP'
    : final.recommendation === 'closer'
    ? 'Needs Closer Follow-Up'
    : 'Continue Cardiology Follow-Up';

  let bannerDetail = '';
  if (final.recommendation !== 'discharge' && final.interval) {
    bannerDetail = `Suggested return visit in ${final.interval} month${final.interval !== 1 ? 's' : ''}`;
  } else if (final.recommendation === 'discharge') {
    bannerDetail = 'This patient may be safely transitioned to primary care management';
  }

  const banner = document.createElement('div');
  banner.className = `result-banner ${bannerClass}`;
  banner.innerHTML = `
    <div class="result-icon">${bannerIcon}</div>
    <h2 class="result-title">${bannerTitle}</h2>
    <p class="result-detail">${bannerDetail}</p>
  `;
  screen.appendChild(banner);

  // Per-condition breakdown (if multiple)
  if (results.length > 1) {
    const breakdownSection = createExpandableSection('Condition Breakdown', true);
    const list = document.createElement('ul');
    for (const r of results) {
      const li = document.createElement('li');
      const name = r.subtypeName ? `${r.conditionName} — ${r.subtypeName}` : r.conditionName;
      const rec = formatRecommendation(r.result.recommendation);
      const interval = r.result.interval ? ` (${r.result.interval}mo)` : '';
      li.textContent = `${name}: ${rec}${interval}`;
      list.appendChild(li);
    }
    breakdownSection.querySelector('.expandable-body').appendChild(list);
    screen.appendChild(breakdownSection);
  }

  // Key Reasons
  const allReasons = final.reasons || [];
  if (allReasons.length > 0) {
    const reasonsSection = createExpandableSection('Key Reasons');
    const list = document.createElement('ul');
    for (const reason of allReasons) {
      const li = document.createElement('li');
      li.textContent = reason;
      list.appendChild(li);
    }
    reasonsSection.querySelector('.expandable-body').appendChild(list);
    screen.appendChild(reasonsSection);
  }

  // PCP Instructions
  const allPrecautions = final.precautions || [];
  if (allPrecautions.length > 0) {
    const pcpSection = createExpandableSection('PCP Instructions & Return Precautions');
    const list = document.createElement('ul');
    for (const precaution of allPrecautions) {
      const li = document.createElement('li');
      li.textContent = precaution;
      list.appendChild(li);
    }
    pcpSection.querySelector('.expandable-body').appendChild(list);
    screen.appendChild(pcpSection);
  }

  // Risk Scores
  const allScores = final.scores || [];
  if (allScores.length > 0) {
    const scoreCards = document.createElement('div');
    scoreCards.className = 'score-cards';
    for (const score of allScores) {
      const card = document.createElement('div');
      card.className = 'score-card';
      card.innerHTML = `
        <div class="score-label">${score.name}</div>
        <div class="score-value">${score.score}/${score.maxScore}</div>
        <div class="score-interpretation">${score.interpretation}</div>
      `;
      scoreCards.appendChild(card);
    }
    screen.appendChild(scoreCards);
  }

  // Action bar
  const actionBar = document.createElement('div');
  actionBar.className = 'action-bar';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-secondary';
  editBtn.textContent = 'Edit Answers';
  editBtn.addEventListener('click', onEditAnswers);

  const newBtn = document.createElement('button');
  newBtn.className = 'btn btn-secondary';
  newBtn.textContent = 'New Patient';
  newBtn.addEventListener('click', onNewPatient);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-primary';
  exportBtn.textContent = 'Export';
  exportBtn.addEventListener('click', () => showExportModal(summaryText));

  actionBar.appendChild(editBtn);
  actionBar.appendChild(newBtn);
  actionBar.appendChild(exportBtn);
  screen.appendChild(actionBar);

  return screen;
}

function createExpandableSection(title, startOpen = false) {
  const section = document.createElement('div');
  section.className = 'expandable-section' + (startOpen ? ' open' : '');

  section.innerHTML = `
    <button class="expandable-header">
      <span>${title}</span>
      <svg class="expandable-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="expandable-content">
      <div class="expandable-body"></div>
    </div>
  `;

  section.querySelector('.expandable-header').addEventListener('click', () => {
    section.classList.toggle('open');
  });

  return section;
}

function showExportModal(summaryText) {
  openModal((container) => {
    container.innerHTML = `
      <div class="modal-header">
        <h3 class="modal-title">Export Summary</h3>
        <button class="modal-close" id="exportCloseBtn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="export-options">
        <button class="export-option" id="exportPrint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <div class="export-option-text">
            <div>Print</div>
            <div class="export-option-desc">Print-friendly format for the medical record</div>
          </div>
        </button>
        <button class="export-option" id="exportDownload">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          <div class="export-option-text">
            <div>Download</div>
            <div class="export-option-desc">Save as text file</div>
          </div>
        </button>
        <button class="export-option" id="exportCopy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <div class="export-option-text">
            <div>Copy to Clipboard</div>
            <div class="export-option-desc">Paste into EHR notes</div>
          </div>
        </button>
      </div>
    `;

    container.querySelector('#exportCloseBtn').addEventListener('click', closeModal);
    container.querySelector('#exportPrint').addEventListener('click', () => {
      closeModal();
      setTimeout(() => printSummary(), 200);
    });
    container.querySelector('#exportDownload').addEventListener('click', () => {
      downloadSummary(summaryText);
      closeModal();
    });
    container.querySelector('#exportCopy').addEventListener('click', async () => {
      const success = await copyToClipboard(summaryText);
      const btn = container.querySelector('#exportCopy');
      if (success) {
        btn.querySelector('.export-option-text div:first-child').textContent = 'Copied!';
        setTimeout(() => closeModal(), 800);
      }
    });
  });
}

function formatRecommendation(rec) {
  switch (rec) {
    case 'discharge': return 'Safe to discharge';
    case 'continue': return 'Continue follow-up';
    case 'closer': return 'Closer follow-up needed';
    default: return rec;
  }
}

function buildQuickSummary(final, results) {
  const lines = ['CARDIOLOGY CONTINUITY CLINIC — DISCHARGE ASSESSMENT'];
  lines.push(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push('');
  for (const r of results) {
    const name = r.subtypeName ? `${r.conditionName} — ${r.subtypeName}` : r.conditionName;
    lines.push(`${name}: ${formatRecommendation(r.result.recommendation)}`);
  }
  lines.push('');
  lines.push(`RECOMMENDATION: ${formatRecommendation(final.recommendation).toUpperCase()}`);
  if (final.interval) lines.push(`Follow-up: ${final.interval} months`);
  if (final.reasons?.length) {
    lines.push(''); lines.push('Reasons:');
    final.reasons.forEach(r => lines.push(`  • ${r}`));
  }
  if (final.precautions?.length) {
    lines.push(''); lines.push('PCP Instructions:');
    final.precautions.forEach(p => lines.push(`  • ${p}`));
  }
  lines.push('');
  lines.push('---');
  lines.push('Generated by CardioDischarge — Clinical decision support only.');
  return lines.join('\n');
}
