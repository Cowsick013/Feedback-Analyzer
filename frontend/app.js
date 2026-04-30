// app.js
// Handles user interaction, API calls, and rendering results to the DOM.

const analyzeBtn = document.getElementById('analyze-btn');
const transcriptInput = document.getElementById('transcript');
const errorBanner = document.getElementById('error-banner');
const errorText = document.getElementById('error-text');
const loading = document.getElementById('loading');
const results = document.getElementById('results');

// ── Main click handler ──
analyzeBtn.addEventListener('click', async () => {
  const transcript = transcriptInput.value.trim();

  // Basic frontend validation before hitting the API
  if (!transcript) return showError('Please paste a transcript before analyzing.');
  if (transcript.length < 50) return showError('Transcript is too short. Please paste the full text.');

  // Reset UI state
  hideError();
  results.classList.add('hidden');
  setLoading(true);
  analyzeBtn.disabled = true;

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      // Show backend error with detail if available
      const msg = json.error || 'Something went wrong.';
      const detail = json.detail ? `\n\nDetail: ${json.detail}` : '';
      return showError(msg + detail);
    }

    renderResults(json.data, json.attempt);

  } catch (err) {
    showError('Network error — make sure the backend is running on port 3000.');
  } finally {
    setLoading(false);
    analyzeBtn.disabled = false;
  }
});

// ── Render all result cards ──
function renderResults(d, attempt) {

  // 1. SCORE CARD
  const scoreClass = d.score <= 3 ? 'low' : d.score <= 6 ? 'mid' : 'high';
  const labelClass = d.classification === 'systems_building' ? 'systems' : 'execution';
  const labelText  = d.classification === 'systems_building' ? '🏗 Systems Builder' : '⚙️ Execution Only';

  document.getElementById('score-content').innerHTML = `
    <div class="score-row">
      <div class="score-badge ${scoreClass}">${d.score}</div>
      <div>
        <span class="score-label ${labelClass}">${labelText}</span>
        <p class="score-justification">${d.score_justification}</p>
      </div>
    </div>
    ${d._warning ? `<div class="warning-box">⚠️ ${d._warning}</div>` : ''}
  `;

  // 2. EVIDENCE CARD
  // 2. EVIDENCE CARD — now renders quote + type + insight
  const evidenceItems = d.evidence.map(e => {
    // handle both old flat string format and new object format
    if (typeof e === 'string') {
      return `<li><span class="e-quote">"${e}"</span></li>`;
    }
    const typeColor = e.type === 'positive' ? 'e-positive' : e.type === 'negative' ? 'e-negative' : 'e-neutral';
    return `
      <li>
        <span class="e-type ${typeColor}">${e.type}</span>
        <span class="e-quote">"${e.quote}"</span>
        <span class="e-insight">→ ${e.insight}</span>
      </li>
    `;
  }).join('');
  document.getElementById('evidence-content').innerHTML = `
    <ul class="evidence-list">${evidenceItems}</ul>
  `;

  // 3. KPI MAPPING CARD
  const kpiLabels = {
    lead_generation: 'Lead Generation',
    lead_conversion: 'Lead Conversion',
    upselling: 'Upselling',
    cross_selling: 'Cross Selling',
    nps: 'NPS',
    pat: 'PAT',
    tat: 'TAT',
    quality: 'Quality'
  };

  const kpiRows = Object.entries(d.kpi_mapping).map(([key, value]) => {
    const isEmpty = value === 'No evidence found';
    return `
      <tr>
        <td class="kpi-name">${kpiLabels[key] || key}</td>
        <td class="${isEmpty ? 'missing' : 'found'}">${value}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('kpi-content').innerHTML = `
    <table class="kpi-table">
      <thead><tr><th>KPI</th><th>Evidence</th></tr></thead>
      <tbody>${kpiRows}</tbody>
    </table>
  `;

  // 4. GAP ANALYSIS CARD
  const gapLabels = {
    missing_execution_evidence: 'Missing Execution Evidence',
    missing_systems_building:   'Missing Systems Building',
    missing_kpi_impact:         'Missing KPI Impact',
    missing_change_management:  'Missing Change Management'
  };

  const gapItems = Object.entries(d.gap_analysis).map(([key, value]) => `
    <div class="gap-item">
      <dt>${gapLabels[key] || key}</dt>
      <dd>${value}</dd>
    </div>
  `).join('');

  document.getElementById('gaps-content').innerHTML = `
    <dl class="gap-list">${gapItems}</dl>
  `;

  // 5. FOLLOW-UP QUESTIONS CARD
  const questionItems = d.follow_up_questions
    .map(q => `<li>${q}</li>`)
    .join('');
  document.getElementById('questions-content').innerHTML = `
    <ul class="questions-list">${questionItems}</ul>
  `;

  // 5b. REASONING BREAKDOWN — insert into questions card bottom
  if (d.reasoningBreakdown) {
    const rb = d.reasoningBreakdown;
    const rbHTML = `
      <div style="margin-top:20px;padding-top:16px;border-top:2px solid #f0f2f6">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;color:#1a1a2e">Reasoning Breakdown</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="background:#f4f6f9;border-radius:8px;padding:12px">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:6px">Execution</div>
            <div style="font-size:13px;color:#333;line-height:1.5">${rb.execution}</div>
          </div>
          <div style="background:#f4f6f9;border-radius:8px;padding:12px">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:6px">Systems</div>
            <div style="font-size:13px;color:#333;line-height:1.5">${rb.systems}</div>
          </div>
          <div style="background:#f4f6f9;border-radius:8px;padding:12px">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:6px">KPI Impact</div>
            <div style="font-size:13px;color:#333;line-height:1.5">${rb.kpiImpact}</div>
          </div>
          <div style="background:#fff0f0;border-radius:8px;padding:12px;border-left:3px solid #e94560">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#e94560;margin-bottom:6px">Change Management</div>
            <div style="font-size:13px;color:#333;line-height:1.5">${rb.changeManagement}</div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('questions-card').innerHTML += rbHTML;
  }
  // 6. META / AI HEALTH CARD
  const riskClass = `risk-${d.hallucination_risk}`;
  const dataClass = `data-${d.data_completeness}`;
  document.getElementById('meta-content').innerHTML = `
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">AI Attempts</div>
        <div class="meta-value">${attempt} / 3</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Hallucination Risk</div>
        <div class="meta-value ${riskClass}">${capitalize(d.hallucination_risk)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Data Completeness</div>
        <div class="meta-value ${dataClass}">${capitalize(d.data_completeness)}</div>
      </div>
    </div>
  `;

  // Show results section
  results.classList.remove('hidden');

  // Smooth scroll to results
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Helpers ──
function showError(msg) {
  errorText.textContent = msg;
  errorBanner.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() {
  errorBanner.classList.add('hidden');
}

function setLoading(on) {
  loading.classList.toggle('hidden', !on);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}