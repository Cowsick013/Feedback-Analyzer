# Trinethra Module — Supervisor Feedback Analyzer

**DeepThought Software Developer Internship Assignment**

---

## What This Project Does

Trinethra is a web application that takes a supervisor's spoken or written transcript and produces a structured, validated performance evaluation of a Fellow. It uses a local LLM (Ollama with phi3:mini) to generate the analysis — but critically, it does **not blindly trust the AI output**. Every response passes through a multi-layer guardrail system before reaching the user.

---

## How to Run Locally

### Prerequisites
- Node.js installed
- Ollama installed and running (`ollama serve`)
- phi3:mini pulled (`ollama pull phi3:mini`)

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd trinethra

# 2. Install backend dependencies
cd backend
npm install

# 3. Start the backend
node server.js

# 4. Open the app
# Go to http://localhost:3000 in your browser
```

---

## Folder Structure

```
trinethra/
├── backend/
│   ├── server.js               # Express entry point
│   ├── routes/
│   │   └── analyze.js          # POST /api/analyze — orchestrates the full pipeline
│   └── services/
│       ├── promptBuilder.js    # Builds the structured prompt sent to Ollama
│       ├── ollamaClient.js     # HTTP client for Ollama API
│       └── validator.js        # 10-layer guardrail validation system
├── frontend/
│   ├── index.html              # Single page UI
│   ├── style.css               # Clean, readable styling
│   └── app.js                  # Fetch, render, error handling
└── README.md
```

---

## Approach

The system is built around one core principle: **the AI generates, the system validates, the human reviews**.

### System Flow

```
User pastes transcript
       ↓
Frontend sends POST /api/analyze
       ↓
promptBuilder.js injects rubric + guardrail rules into prompt
       ↓
ollamaClient.js sends prompt to Ollama (phi3:mini, temp=0.1)
       ↓
validator.js checks output through 10 guardrail layers
       ↓
If invalid → retry (up to 3 attempts)
       ↓
If valid → return structured JSON to frontend
       ↓
Frontend renders Score, Evidence, KPI Mapping, Gaps, Questions, Reasoning Breakdown
```

---

## Prompt Design

The prompt is the most important part of the system. It was designed iteratively through real testing and failure analysis.

### Key Design Decisions

**1. Rubric injection**
The full scoring rubric (1–3, 4–6, 7–10) is embedded in the prompt so the model applies consistent logic rather than general sentiment.

**2. Execution vs Systems Building distinction**
The prompt explicitly defines the difference:
- Execution = completing assigned tasks (max score 6)
- Systems Building = creating processes that persist after the Fellow leaves (score 7+)

**3. System Validity Rule**
A system is only valid if it is actively used and changes behavior. A dashboard nobody looks at is NOT a system. This was added after testing revealed the model over-credited Fellows for building unused tools.

**4. Supervisor Bias Detection**
The prompt instructs the model to evaluate Fellow behavior, not supervisor tone. A skeptical supervisor does not mean a low-performing Fellow. This was added after discovering the model penalized Fellows when supervisors sounded doubtful, even when transcript evidence showed systems thinking.

**5. KPI Linking Rules**
The prompt explicitly maps behavioral signals to KPIs:
- Avoided delays → TAT
- Defect analysis → Quality
- Tracking improvements → Lead Generation/Conversion

**6. Anti-hallucination rules**
The model is instructed to say "No evidence found" rather than invent connections. All evidence must come directly from the transcript.

**7. JSON-only output**
Temperature is set to 0.1 and the prompt opens with a strict JSON-only instruction to minimize formatting noise.

---

## Guardrail System

Ten sequential validation layers in `validator.js`:

| # | Guardrail | What it catches |
|---|-----------|-----------------|
| 1 | Markdown fence stripping | Model wrapping JSON in backticks |
| 2 | JSON extraction | Finding the JSON object even if text surrounds it |
| 3 | JSON parse | Malformed or truncated JSON |
| 4 | Score range check | Score outside 1–10 |
| 5 | Evidence presence | Empty or missing evidence array |
| 6 | Evidence quality | Trivial or blank evidence entries |
| 7 | Classification validation | Invalid classification values |
| 8 | Required fields check | Missing top-level fields |
| 9 | KPI completeness | Missing any of the 8 required KPIs |
| 10 | Cross-field logic | Score ≥7 with execution_only (flags for human review) |

If any layer fails, the retry loop triggers. After 3 failed attempts, the system returns a detailed error explaining which guardrail failed and why.

---

## AI Risks Handled

| Risk | How Handled |
|------|-------------|
| Hallucination | Evidence must be transcript-grounded; "No evidence found" is required when absent |
| Generic answers | Rubric + linking rules force specific, structured reasoning |
| Misclassification | System Validity Rule prevents crediting unused systems |
| Supervisor bias | Explicit bias detection rules separate tone from behavior |
| JSON failures | Retry loop + markdown stripping + JSON extraction |
| Score drift | Hard range validation + scoring decision tree in prompt |

---

## Key Insight from Testing

During testing, I discovered the model was scoring a Fellow **7 (systems_building)** for building a dashboard the supervisor admitted they "don't look at much." The correct score was 6.

This revealed that the model was pattern-matching on "built a tool" without checking if the tool was actually used. I added the **System Validity Rule** to the prompt to fix this:

> A system is only valid if it is used by others OR changes how work is done. If a tool is created but not used or adopted, it is execution support, not systems building.

This kind of iterative debugging — finding the failure, understanding why it happened, and fixing the root cause in the prompt — is exactly the systems thinking this project is designed to test.

---

## Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** Node.js, Express
- **AI:** Ollama (phi3:mini, local)
- **Validation:** Custom guardrail layer (no external libraries)
