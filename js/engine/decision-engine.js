/**
 * Decision Engine — evaluates JSON rules against questionnaire answers.
 * Supports: equals, in, gte, gt, lt, lte, between predicates
 * Combinators: all, any, or
 */

export function evaluateCondition(condition, answers) {
  if (condition.all) {
    return condition.all.every(c => evaluateCondition(c, answers));
  }
  if (condition.any) {
    return condition.any.some(c => evaluateCondition(c, answers));
  }
  if (condition.or) {
    return condition.or.some(c => evaluateCondition(c, answers));
  }
  if (condition.not) {
    return !evaluateCondition(condition.not, answers);
  }

  const value = answers[condition.field];
  if (value === undefined || value === null || value === '') return false;

  let result = true;

  if ('equals' in condition) {
    result = result && (value === condition.equals || String(value) === String(condition.equals));
  }
  if ('not_equals' in condition) {
    result = result && (value !== condition.not_equals && String(value) !== String(condition.not_equals));
  }
  if ('in' in condition) {
    result = result && condition.in.includes(value);
  }
  if ('not_in' in condition) {
    result = result && !condition.not_in.includes(value);
  }
  if ('gte' in condition) {
    result = result && (Number(value) >= condition.gte);
  }
  if ('gt' in condition) {
    result = result && (Number(value) > condition.gt);
  }
  if ('lte' in condition) {
    result = result && (Number(value) <= condition.lte);
  }
  if ('lt' in condition) {
    result = result && (Number(value) < condition.lt);
  }
  if ('between' in condition) {
    const num = Number(value);
    result = result && (num >= condition.between[0] && num <= condition.between[1]);
  }

  // Additional AND condition on same rule
  if (condition.and) {
    result = result && evaluateCondition(condition.and, answers);
  }

  return result;
}

/**
 * Evaluate discharge eligibility for a condition subtype.
 * Returns { recommendation, interval, reasons, precautions, scores }
 */
export function evaluateDischarge(rules, answers) {
  const result = {
    recommendation: 'continue', // 'discharge', 'continue', 'closer'
    interval: null,
    reasons: [],
    precautions: [],
    failedCriteria: [],
    metCriteria: []
  };

  // Check for "closer follow-up" triggers first (highest priority)
  if (rules.closer_followup) {
    const triggers = rules.closer_followup.any || rules.closer_followup.conditions || [];
    for (const trigger of triggers) {
      if (evaluateCondition(trigger, answers)) {
        result.reasons.push(trigger.reason || trigger.description || 'Requires closer monitoring');
        result.recommendation = 'closer';
      }
    }
  }

  // If not closer, check discharge eligibility
  if (result.recommendation !== 'closer' && rules.discharge_eligible) {
    const criteria = rules.discharge_eligible.all || rules.discharge_eligible.conditions || [];
    let allMet = true;

    for (const criterion of criteria) {
      if (evaluateCondition(criterion, answers)) {
        result.metCriteria.push(criterion.reason || criterion.description || 'Criterion met');
      } else {
        allMet = false;
        result.failedCriteria.push(criterion.reason || criterion.description || 'Criterion not met');
      }
    }

    if (allMet && criteria.length > 0) {
      result.recommendation = 'discharge';
    } else {
      result.recommendation = 'continue';
      result.reasons = result.failedCriteria.slice();
    }
  }

  // Determine follow-up interval
  if (result.recommendation !== 'discharge' && rules.followup_interval) {
    let shortestInterval = null;
    for (const rule of rules.followup_interval.rules || []) {
      if (rule.default !== undefined) {
        if (shortestInterval === null) shortestInterval = rule.default;
        continue;
      }
      if (rule.if && evaluateCondition(rule.if, answers)) {
        const months = rule.months;
        if (shortestInterval === null || months < shortestInterval) {
          shortestInterval = months;
        }
      }
    }
    result.interval = shortestInterval;
  }

  // Collect PCP precautions
  if (rules.pcp_precautions) {
    for (const precaution of rules.pcp_precautions) {
      if (!precaution.condition || evaluateCondition(precaution.condition, answers)) {
        result.precautions.push(precaution.text);
      }
    }
  }

  return result;
}

/**
 * Evaluate multiple conditions and return the most conservative recommendation.
 */
export function evaluateMultipleConditions(conditionResults) {
  if (conditionResults.length === 0) return null;
  if (conditionResults.length === 1) return conditionResults[0];

  const priority = { closer: 0, continue: 1, discharge: 2 };
  let mostConservative = conditionResults[0];

  for (let i = 1; i < conditionResults.length; i++) {
    const current = conditionResults[i];
    if (priority[current.recommendation] < priority[mostConservative.recommendation]) {
      mostConservative = current;
    } else if (current.recommendation === mostConservative.recommendation) {
      // Same recommendation — use shorter interval
      if (current.interval && (!mostConservative.interval || current.interval < mostConservative.interval)) {
        mostConservative.interval = current.interval;
      }
    }
  }

  // Merge all precautions and reasons from all conditions
  const merged = {
    recommendation: mostConservative.recommendation,
    interval: mostConservative.interval,
    reasons: [],
    precautions: [],
    conditionResults: conditionResults
  };

  for (const cr of conditionResults) {
    merged.reasons.push(...cr.reasons);
    merged.precautions.push(...cr.precautions);
  }

  // Deduplicate
  merged.reasons = [...new Set(merged.reasons)];
  merged.precautions = [...new Set(merged.precautions)];

  return merged;
}

export function evaluateCondition(condition, answers) {
  const value = answers[condition.field];
  if (value === undefined || value === null || value === '') return false;

  const isEqual = (a, b) => String(a) === String(b);
  let result = true;

  if ('equals' in condition) result = result && isEqual(value, condition.equals);
  if ('in' in condition) result = result && condition.in.some(opt => isEqual(opt, value));
  if ('gte' in condition) result = result && (Number(value) >= condition.gte);
  if ('lt' in condition) result = result && (Number(value) < condition.lt);
  
  if (condition.and) result = result && evaluateCondition(condition.and, answers);
  return result;
}

export function calculateFollowUp(answers, rules) {
    if (!rules || !rules.followup_interval) return { value: 6, unit: 'months' };
    let recommendations = [];

    rules.followup_interval.rules.forEach(rule => {
        if (rule.if && evaluateCondition(rule.if, answers)) {
            if (rule.days) recommendations.push({ value: rule.days, unit: 'days' });
            else if (rule.weeks) recommendations.push({ value: rule.weeks, unit: 'weeks' });
            else if (rule.months) recommendations.push({ value: rule.months, unit: 'months' });
        }
    });

    if (recommendations.length > 0) {
        return recommendations.sort((a, b) => {
            const toDays = (r) => {
                const val = Number(r.value) || 0;
                if (r.unit === 'days') return val;
                if (r.unit === 'weeks') return val * 7;
                return val * 30;
            };
            return toDays(a) - toDays(b);
        })[0];
    }
    return { value: rules.followup_interval.default || 6, unit: 'months' };
}
export function evaluateCondition(condition, answers) {
  const value = answers[condition.field];
  if (value === undefined || value === null || value === '') return false;

  const isEqual = (a, b) => String(a) === String(b);
  let result = true;

  if ('equals' in condition) result = result && isEqual(value, condition.equals);
  if ('in' in condition) result = result && condition.in.some(opt => isEqual(opt, value));
  if ('gte' in condition) result = result && (Number(value) >= condition.gte);
  if ('lt' in condition) result = result && (Number(value) < condition.lt);
  
  return result;
}

export function calculateFollowUp(answers, rules) {
    if (!rules || !rules.followup_interval) return { value: 6, unit: 'months' };
    let recommendations = [];

    rules.followup_interval.rules.forEach(rule => {
        if (rule.if && evaluateCondition(rule.if, answers)) {
            if (rule.days) recommendations.push({ value: rule.days, unit: 'days' });
            else if (rule.weeks) recommendations.push({ value: rule.weeks, unit: 'weeks' });
            else if (rule.months) recommendations.push({ value: rule.months, unit: 'months' });
        }
    });

    if (recommendations.length > 0) {
        return recommendations.sort((a, b) => {
            const toDays = (r) => {
                const val = Number(r.value) || 0;
                if (r.unit === 'days') return val;
                if (r.unit === 'weeks') return val * 7;
                return val * 30;
            };
            return toDays(a) - toDays(b);
        })[0];
    }
    return { value: rules.followup_interval.default || 6, unit: 'months' };
}
