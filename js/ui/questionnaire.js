/**
 * Questionnaire — dynamic stepper form rendered from condition JSON sections.
 */

import { renderQuestion, shouldShowField } from '../utils/form-helpers.js';
import { computeScores } from '../engine/scoring.js';

export function renderQuestionnaire(config) {
  const {
    conditionName, subtypeName, sections, currentStep,
    answers, conditionId, onAnswer, onStepChange, onComplete, onBack
  } = config;

  const screen = document.createElement('div');
  screen.className = 'screen';

  // Header
  const header = document.createElement('div');
  header.className = 'screen-header';
  const displayName = subtypeName && subtypeName !== conditionName ? `${conditionName} — ${subtypeName}` : conditionName;
  header.innerHTML = `<h2 class="screen-title">${displayName}</h2>`;
  screen.appendChild(header);

  // Step indicator
  if (sections.length > 1) {
    const indicator = document.createElement('div');
    indicator.className = 'step-indicator';
    for (let i = 0; i < sections.length; i++) {
      const dot = document.createElement('div');
      dot.className = 'step-dot';
      if (i === currentStep) dot.classList.add('active');
      else if (i < currentStep) dot.classList.add('completed');
      indicator.appendChild(dot);
    }
    screen.appendChild(indicator);
  }

  // Current section
  const section = sections[currentStep];
  if (!section) { onComplete(); return screen; }

  const sectionEl = document.createElement('div');
  sectionEl.className = 'form-section';

  const sectionTitle = document.createElement('h3');
  sectionTitle.className = 'section-title';
  sectionTitle.textContent = section.title || section.name;
  sectionEl.appendChild(sectionTitle);

  // Render questions
  for (const question of section.questions) {
    const visible = shouldShowField(question, answers);

    if (question.condition) {
      // Conditional field with animation
      const wrapper = document.createElement('div');
      wrapper.className = 'conditional-field' + (visible ? ' visible' : '');
      wrapper.id = `cond-${question.id}`;
      if (visible) {
        wrapper.appendChild(renderQuestion(question, answers[question.id], handleAnswer));
      }
      sectionEl.appendChild(wrapper);
    } else if (visible) {
      sectionEl.appendChild(renderQuestion(question, answers[question.id], handleAnswer));
    }
  }

  screen.appendChild(sectionEl);

  // Inline risk score display (if applicable for current data)
  const scores = computeScores(conditionId, answers);
  if (scores.length > 0) {
    const scoreSection = document.createElement('div');
    scoreSection.className = 'score-cards';
    scoreSection.style.marginTop = '24px';
    for (const score of scores) {
      if (score.score > 0 || score.items.length > 0) {
        const card = document.createElement('div');
        card.className = 'score-card';
        card.innerHTML = `
          <div class="score-label">${score.name}</div>
          <div class="score-value">${score.score}</div>
          <div class="score-interpretation">${score.interpretation}</div>
        `;
        scoreSection.appendChild(card);
      }
    }
    if (scoreSection.children.length > 0) {
      screen.appendChild(scoreSection);
    }
  }

  // Navigation
  const nav = document.createElement('div');
  nav.className = 'step-nav';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = currentStep === 0 ? '← Back' : '← Previous';
  backBtn.addEventListener('click', () => {
    if (currentStep === 0) {
      onBack();
    } else {
      onStepChange(currentStep - 1);
    }
  });
  nav.appendChild(backBtn);

  const isLastStep = currentStep === sections.length - 1;
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary';
  nextBtn.textContent = isLastStep ? 'Get Recommendation' : 'Next →';
  nextBtn.addEventListener('click', () => {
    if (isLastStep) {
      onComplete();
    } else {
      onStepChange(currentStep + 1);
    }
  });
  nav.appendChild(nextBtn);

  screen.appendChild(nav);

  // Handle answer changes with conditional field updates
  function handleAnswer(questionId, value) {
    onAnswer(questionId, value);
    // Update conditional fields visibility
    for (const q of section.questions) {
      if (q.condition) {
        const wrapper = document.getElementById(`cond-${q.id}`);
        if (wrapper) {
          const shouldShow = shouldShowField(q, answers);
          if (shouldShow && !wrapper.classList.contains('visible')) {
            wrapper.classList.add('visible');
            if (wrapper.children.length === 0) {
              wrapper.appendChild(renderQuestion(q, answers[q.id], handleAnswer));
            }
          } else if (!shouldShow && wrapper.classList.contains('visible')) {
            wrapper.classList.remove('visible');
          }
        }
      }
    }
  }

  return screen;
}
