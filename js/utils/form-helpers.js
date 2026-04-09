/**
 * Dynamic form generation utilities.
 */

/**
 * Render a single question as HTML based on its type.
 */
export function renderQuestion(question, currentValue, onChangeCallback) {
  const group = document.createElement('div');
  group.className = 'form-group';
  group.id = `q-${question.id}`;

  // Label
  const label = document.createElement('label');
  label.className = 'form-label';
  label.setAttribute('for', `input-${question.id}`);
  label.textContent = question.label || question.text;
  if (question.hint) {
    const hint = document.createElement('span');
    hint.className = 'form-hint';
    hint.textContent = ` ${question.hint}`;
    label.appendChild(hint);
  }
  group.appendChild(label);

  switch (question.type) {
    case 'select':
      group.appendChild(renderSelect(question, currentValue, onChangeCallback));
      break;
    case 'boolean':
      group.appendChild(renderToggle(question, currentValue, onChangeCallback));
      break;
    case 'number':
      group.appendChild(renderNumber(question, currentValue, onChangeCallback));
      break;
    default:
      group.appendChild(renderSelect(question, currentValue, onChangeCallback));
  }

  return group;
}

function renderSelect(question, currentValue, onChange) {
  const select = document.createElement('select');
  select.className = 'form-select';
  select.id = `input-${question.id}`;

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select...';
  placeholder.disabled = true;
  placeholder.selected = !currentValue;
  select.appendChild(placeholder);

  for (const opt of question.options || []) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (currentValue === opt.value) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', () => onChange(question.id, select.value));
  return select;
}

function renderToggle(question, currentValue, onChange) {
  const group = document.createElement('div');
  group.className = 'toggle-group';

  const yesId = `input-${question.id}-yes`;
  const noId = `input-${question.id}-no`;
  const name = `toggle-${question.id}`;

  // Yes option
  const yesWrapper = document.createElement('div');
  yesWrapper.className = 'toggle-option';
  const yesInput = document.createElement('input');
  yesInput.type = 'radio';
  yesInput.name = name;
  yesInput.id = yesId;
  yesInput.value = 'true';
  if (currentValue === true || currentValue === 'true') yesInput.checked = true;
  const yesLabel = document.createElement('label');
  yesLabel.className = 'toggle-label';
  yesLabel.setAttribute('for', yesId);
  yesLabel.textContent = 'Yes';
  yesWrapper.appendChild(yesInput);
  yesWrapper.appendChild(yesLabel);

  // No option
  const noWrapper = document.createElement('div');
  noWrapper.className = 'toggle-option';
  const noInput = document.createElement('input');
  noInput.type = 'radio';
  noInput.name = name;
  noInput.id = noId;
  noInput.value = 'false';
  if (currentValue === false || currentValue === 'false') noInput.checked = true;
  const noLabel = document.createElement('label');
  noLabel.className = 'toggle-label';
  noLabel.setAttribute('for', noId);
  noLabel.textContent = 'No';
  noWrapper.appendChild(noInput);
  noWrapper.appendChild(noLabel);

  group.appendChild(yesWrapper);
  group.appendChild(noWrapper);

  yesInput.addEventListener('change', () => onChange(question.id, true));
  noInput.addEventListener('change', () => onChange(question.id, false));

  return group;
}

function renderNumber(question, currentValue, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-number-wrapper';

  const minusBtn = document.createElement('button');
  minusBtn.type = 'button';
  minusBtn.className = 'num-btn';
  minusBtn.textContent = '−';
  minusBtn.setAttribute('aria-label', 'Decrease');

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'form-number';
  input.id = `input-${question.id}`;
  if (question.min !== undefined) input.min = question.min;
  if (question.max !== undefined) input.max = question.max;
  if (question.step !== undefined) input.step = question.step;
  if (currentValue !== undefined && currentValue !== null) input.value = currentValue;
  input.placeholder = question.placeholder || '';

  const plusBtn = document.createElement('button');
  plusBtn.type = 'button';
  plusBtn.className = 'num-btn';
  plusBtn.textContent = '+';
  plusBtn.setAttribute('aria-label', 'Increase');

  const step = question.step || 1;

  minusBtn.addEventListener('click', () => {
    const val = Number(input.value) - step;
    if (question.min === undefined || val >= question.min) {
      input.value = val;
      onChange(question.id, val);
    }
  });

  plusBtn.addEventListener('click', () => {
    const val = Number(input.value) + step;
    if (question.max === undefined || val <= question.max) {
      input.value = val;
      onChange(question.id, val);
    }
  });

  input.addEventListener('change', () => {
    const val = Number(input.value);
    onChange(question.id, val);
  });

  wrapper.appendChild(minusBtn);
  wrapper.appendChild(input);
  wrapper.appendChild(plusBtn);

  return wrapper;
}

/**
 * Check if a conditional field should be visible.
 */
export function shouldShowField(question, answers) {
  if (!question.condition) return true;
  const { field, equals, not_equals, in: inList } = question.condition;
  const value = answers[field];
  if (equals !== undefined) return value === equals || String(value) === String(equals);
  if (not_equals !== undefined) return value !== not_equals && String(value) !== String(not_equals);
  if (inList) return inList.includes(value);
  return true;
}
