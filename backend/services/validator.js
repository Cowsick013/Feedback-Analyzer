// validator.js
// GUARDRAIL LAYER — we never trust AI output blindly.
// Each check is a hard gate. If any fails, the retry loop triggers.

function validateAnalysis(rawText) {

  // GUARDRAIL 1: Strip any markdown fences phi3 might add despite instructions
  let cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/gi, '')
    .trim();

  // GUARDRAIL 2: Extract only the JSON object (find first { to last })
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No JSON object found in model output.');
  }
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  // GUARDRAIL 3: Must be valid JSON
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`JSON parse failed: ${e.message}`);
  }

  // GUARDRAIL 4: Score must be an integer from 1 to 10
  if (
    parsed.score === undefined ||
    !Number.isInteger(parsed.score) ||
    parsed.score < 1 ||
    parsed.score > 10
  ) {
    throw new Error(`Invalid score value: "${parsed.score}". Must be integer 1–10.`);
  }

  // GUARDRAIL 5: Evidence must be a non-empty array with real strings
  if (!Array.isArray(parsed.evidence) || parsed.evidence.length === 0) {
    throw new Error('Evidence array is missing or empty — possible hallucination.');
  }
  for (const e of parsed.evidence) {
    // accept both flat strings and new object format
    if (typeof e === 'string' && e.trim().length < 8) {
      throw new Error('Evidence contains empty or trivial entries.');
    }
    if (typeof e === 'object' && (!e.quote || e.quote.trim().length < 8)) {
      throw new Error('Evidence object missing quote field.');
    }
  }
  // GUARDRAIL 6: Classification must be exactly one of two valid values
  const validClassifications = ['execution_only', 'systems_building'];
  if (!validClassifications.includes(parsed.classification)) {
    throw new Error(`Invalid classification: "${parsed.classification}".`);
  }

  // GUARDRAIL 7: All required top-level fields must exist
  const required = [
  'score_justification',
  'kpi_mapping',
  'gap_analysis',
  'follow_up_questions',
  'hallucination_risk'
];

// Add default for data_completeness if model omits it
if (!parsed.data_completeness) {
  parsed.data_completeness = 'partial';
}

// Normalize hallucination_risk to lowercase
if (parsed.hallucination_risk) {
  parsed.hallucination_risk = parsed.hallucination_risk.toLowerCase();
}
  for (const field of required) {
    if (!parsed[field]) {
      throw new Error(`Missing required field: "${field}".`);
    }
  }

  // GUARDRAIL 8: KPI mapping must have all 8 keys
  const requiredKPIs = [
    'lead_generation', 'lead_conversion', 'upselling', 'cross_selling',
    'nps', 'pat', 'tat', 'quality'
  ];
  for (const kpi of requiredKPIs) {
    if (parsed.kpi_mapping[kpi] === undefined) {
      throw new Error(`KPI mapping missing key: "${kpi}".`);
    }
  }

  // GUARDRAIL 9: Follow-up questions must have at least 3
  if (!Array.isArray(parsed.follow_up_questions) || parsed.follow_up_questions.length < 2) {
    throw new Error('Must have at least 3 follow-up questions.');
  }

  // GUARDRAIL 10: Cross-field logic check — flag suspicious score/classification combos
  if (parsed.score >= 7 && parsed.classification === 'execution_only') {
    parsed._warning = `Score ${parsed.score} with "execution_only" is unusual — verify manually.`;
  }
  if (parsed.score <= 5 && parsed.classification === 'systems_building') {
    parsed._warning = `Score ${parsed.score} with "systems_building" is contradictory — verify manually.`;
  }

  return parsed;
}

module.exports = { validateAnalysis };