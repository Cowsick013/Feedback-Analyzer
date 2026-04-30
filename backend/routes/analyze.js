// analyze.js
// This route is the brain of the backend.
// It orchestrates: prompt build → Ollama call → validation → retry logic

const express = require('express');
const router = express.Router();
const { buildPrompt } = require('../services/promptBuilder');
const { callOllama } = require('../services/ollamaClient');
const { validateAnalysis } = require('../services/validator');

router.post('/analyze', async (req, res) => {
  const { transcript } = req.body;

  // Basic input guard — reject empty or very short transcripts
  if (!transcript || transcript.trim().length < 50) {
    return res.status(400).json({
      error: 'Transcript is too short or missing. Please paste the full supervisor transcript.'
    });
  }

  const prompt = buildPrompt(transcript);
  const MAX_RETRIES = 3;
  const errors = [];

  // RETRY LOOP — if AI output fails validation, try again up to 3 times
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n🔄 Attempt ${attempt} of ${MAX_RETRIES}...`);

    try {
      // Step 1: Call Ollama with the structured prompt
      const rawOutput = await callOllama(prompt);
      console.log(`📥 Raw output received (${rawOutput.length} chars)`);

      // Step 2: Validate the output through all guardrails
      const validated = validateAnalysis(rawOutput);
      console.log(`✅ Attempt ${attempt} passed validation. Score: ${validated.score}`);

      // Step 3: Return clean validated result to frontend
      return res.json({
        success: true,
        attempt,
        data: validated
      });

    } catch (err) {
      // Log which guardrail failed and why
      console.warn(`❌ Attempt ${attempt} failed: ${err.message}`);
      errors.push(`Attempt ${attempt}: ${err.message}`);
    }
  }

  // All 3 attempts failed — return detailed error to frontend
  console.error('🚫 All attempts failed.');
  return res.status(422).json({
    success: false,
    error: 'AI could not produce valid structured output after 3 attempts.',
    detail: errors.join(' | ')
  });
});

module.exports = router;