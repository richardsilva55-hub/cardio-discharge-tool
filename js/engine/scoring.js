/**
 * Integrated clinical risk calculators.
 * Each calculator takes a flat answers object and returns { score, interpretation, details }.
 */

export const calculators = {
  'cha2ds2-vasc': {
    name: 'CHA₂DS₂-VASc',
    description: 'Stroke risk in atrial fibrillation',
    applicableTo: ['afib-flutter'],
    calculate(answers) {
      let score = 0;
      const items = [];

      if (answers.age !== undefined) {
        const age = Number(answers.age);
        if (age >= 75) { score += 2; items.push('Age ≥75 (+2)'); }
        else if (age >= 65) { score += 1; items.push('Age 65-74 (+1)'); }
      }
      if (answers.sex === 'female') { score += 1; items.push('Female sex (+1)'); }
      if (answers.has_chf === true || answers.has_chf === 'true') { score += 1; items.push('CHF (+1)'); }
      if (answers.has_hypertension === true || answers.has_hypertension === 'true') { score += 1; items.push('Hypertension (+1)'); }
      if (answers.has_stroke_tia === true || answers.has_stroke_tia === 'true') { score += 2; items.push('Stroke/TIA (+2)'); }
      if (answers.has_vascular_disease === true || answers.has_vascular_disease === 'true') { score += 1; items.push('Vascular disease (+1)'); }
      if (answers.has_diabetes === true || answers.has_diabetes === 'true') { score += 1; items.push('Diabetes (+1)'); }

      let interpretation;
      if (score === 0) interpretation = 'Low risk — anticoagulation may not be needed';
      else if (score === 1) interpretation = 'Low-moderate risk — consider anticoagulation';
      else interpretation = 'Moderate-high risk — anticoagulation recommended';

      return { score, maxScore: 9, interpretation, items, name: 'CHA₂DS₂-VASc' };
    }
  },

  'has-bled': {
    name: 'HAS-BLED',
    description: 'Bleeding risk on anticoagulation',
    applicableTo: ['afib-flutter'],
    calculate(answers) {
      let score = 0;
      const items = [];

      if (answers.has_hypertension === true || answers.has_hypertension === 'true') { score += 1; items.push('Hypertension (+1)'); }
      if (answers.has_renal_disease === true || answers.has_renal_disease === 'true') { score += 1; items.push('Renal disease (+1)'); }
      if (answers.has_liver_disease === true || answers.has_liver_disease === 'true') { score += 1; items.push('Liver disease (+1)'); }
      if (answers.has_stroke_tia === true || answers.has_stroke_tia === 'true') { score += 1; items.push('Stroke history (+1)'); }
      if (answers.has_bleeding_history === true || answers.has_bleeding_history === 'true') { score += 1; items.push('Prior bleeding (+1)'); }
      if (answers.inr_labile === true || answers.inr_labile === 'true') { score += 1; items.push('Labile INR (+1)'); }
      if (answers.age !== undefined && Number(answers.age) > 65) { score += 1; items.push('Age >65 (+1)'); }
      if (answers.on_antiplatelet === true || answers.on_antiplatelet === 'true') { score += 1; items.push('Antiplatelet/NSAID (+1)'); }
      if (answers.alcohol_excess === true || answers.alcohol_excess === 'true') { score += 1; items.push('Alcohol excess (+1)'); }

      let interpretation;
      if (score <= 2) interpretation = 'Low bleeding risk';
      else interpretation = 'High bleeding risk — weigh against stroke risk';

      return { score, maxScore: 9, interpretation, items, name: 'HAS-BLED' };
    }
  },

  'hcm-risk-scd': {
    name: 'HCM Risk-SCD',
    description: '5-year sudden cardiac death risk in HCM',
    applicableTo: ['hcm'],
    calculate(answers) {
      // Simplified HCM Risk-SCD (ESC model)
      const items = [];
      let riskFactors = 0;

      if (answers.max_wall_thickness !== undefined && Number(answers.max_wall_thickness) >= 30) {
        riskFactors++; items.push('Wall thickness ≥30mm');
      }
      if (answers.family_hx_scd === true || answers.family_hx_scd === 'true') {
        riskFactors++; items.push('Family history of SCD');
      }
      if (answers.has_nsvt === true || answers.has_nsvt === 'true') {
        riskFactors++; items.push('Non-sustained VT');
      }
      if (answers.has_unexplained_syncope === true || answers.has_unexplained_syncope === 'true') {
        riskFactors++; items.push('Unexplained syncope');
      }
      if (answers.abnormal_bp_response === true || answers.abnormal_bp_response === 'true') {
        riskFactors++; items.push('Abnormal BP response to exercise');
      }
      if (answers.la_size !== undefined && Number(answers.la_size) >= 48) {
        riskFactors++; items.push('LA diameter ≥48mm');
      }
      if (answers.lvot_gradient !== undefined && Number(answers.lvot_gradient) >= 30) {
        riskFactors++; items.push('LVOT gradient ≥30 mmHg');
      }

      let interpretation;
      if (riskFactors === 0) interpretation = 'Low risk (<4%) — ICD generally not indicated';
      else if (riskFactors <= 2) interpretation = 'Intermediate risk — consider ICD based on individual factors';
      else interpretation = 'High risk (≥6%) — ICD should be considered';

      return { score: riskFactors, maxScore: 7, interpretation, items, name: 'HCM Risk-SCD' };
    }
  },

  'ascvd': {
    name: '10-yr ASCVD Risk',
    description: 'Atherosclerotic cardiovascular disease risk',
    applicableTo: ['cad-pci', 'hypertension'],
    calculate(answers) {
      // Simplified risk factor count (full PCE requires race-specific coefficients)
      const items = [];
      let riskFactors = 0;

      if (answers.age !== undefined && Number(answers.age) >= 55) { riskFactors++; items.push('Age ≥55'); }
      if (answers.has_diabetes === true || answers.has_diabetes === 'true') { riskFactors++; items.push('Diabetes'); }
      if (answers.is_smoker === true || answers.is_smoker === 'true') { riskFactors++; items.push('Current smoker'); }
      if (answers.has_hypertension === true || answers.has_hypertension === 'true') { riskFactors++; items.push('Hypertension'); }
      if (answers.has_dyslipidemia === true || answers.has_dyslipidemia === 'true') { riskFactors++; items.push('Dyslipidemia'); }
      if (answers.family_hx_cad === true || answers.family_hx_cad === 'true') { riskFactors++; items.push('Family history of premature CAD'); }
      if (answers.has_ckd === true || answers.has_ckd === 'true') { riskFactors++; items.push('Chronic kidney disease'); }

      let interpretation;
      if (riskFactors <= 1) interpretation = 'Low risk — standard prevention';
      else if (riskFactors <= 3) interpretation = 'Moderate risk — optimize risk factors';
      else interpretation = 'High risk — aggressive risk factor management';

      return { score: riskFactors, maxScore: 7, interpretation, items, name: 'ASCVD Risk Factors' };
    }
  }
};

/**
 * Get applicable calculators for a given condition ID and compute scores.
 */
export function computeScores(conditionId, answers) {
  const results = [];
  for (const [key, calc] of Object.entries(calculators)) {
    if (calc.applicableTo.includes(conditionId)) {
      try {
        results.push({ id: key, ...calc.calculate(answers) });
      } catch (e) {
        // Skip calculator if missing required data
      }
    }
  }
  return results;
}
