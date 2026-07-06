# DATA_INGESTION_SCHEMA.md — Engine Study
# Version: 2026-07-06 (authored from v1 data model; no prior version existed)
# Purpose: defines the telemetry event schema and working-group file format
# that Cosmos agents use when ingesting crowdsourced course data, pilot
# session exports, and cohort diagnostic outputs.
# Scope: v1 export/import envelope + v2 cohort telemetry extension.

---

## 1. THE V1 DATA EXPORT ENVELOPE

Every student's local store exports as a single JSON file conforming to this schema.
`schemaVersion` is validated on import; a mismatch blocks import with an explicit error.

```json
{
  "schemaVersion": 1,
  "exportedAt": "ISO 8601 UTC string",
  "courses": [ /* Course[] — see §1.1 */ ],
  "engines": [ /* Engine[] — see §1.2 */ ],
  "testSessions": [ /* TestSession[] — see §1.3 */ ],
  "leaks": [ /* LeakEntry[] — see §1.4 */ ],
  "mockRuns": [ /* MockRun[] — see §1.5 */ ]
}
```

---

## 2. TELEMETRY EVENT TYPES (crowdsourced working group mapping)

These event types are emitted by the analyst-agent during a drill session and
written to the Cosmos Shared Context Buffer. They are the raw signal from which
per-cohort diagnostic profiles are derived.

### 2.1 Session Events

| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `SESSION_STARTED` | Student opens a drill session | `engineId`, `courseId`, `sessionMode`, `startedAt` |
| `GATE_ATTEMPT_RECORDED` | Student submits gate answer (FULL_RECALL only) | `engineId`, `gateAttempt`, `timestamp` |
| `RECALL_SUBMITTED` | Student submits full recall attempt | `engineId`, `attempt`, `wordCount`, `elapsedSeconds` |
| `SESSION_SELF_MARKED` | Student self-marks result | `engineId`, `result` (`PASS`/`FAIL`), `comprehensionAfter` |
| `SESSION_ABANDONED` | Student exits without marking | `engineId`, `elapsedSeconds` |

### 2.2 Maturity Transition Events

| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `MATURITY_UNTESTED_TO_FRAGILE` | First recorded result on an engine | `engineId`, `result` |
| `MATURITY_FRAGILE_TO_RELIABLE` | passStreak ≥ 3 AND elapsed ≥ 48h | `engineId`, `passStreak`, `elapsedHours` |
| `MATURITY_RELIABLE_DEMOTED` | FAIL or PRECISION_CHECK FAIL | `engineId`, `sessionMode`, `trigger` |
| `COMPREHENSION_FLIPPED` | User manually flips SOLID→SHAKY | `engineId`, `source` (`SESSION`/`EDITOR`) |

### 2.3 Leak Events

| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `LEAK_COMMITTED` | Student logs a committed leak | `engineId`, `courseId`, `leakType`, `source`, `description` |
| `LEAK_GUARDED` | Student logs a guarded risk | `engineId`, `courseId`, `leakType` |
| `MOCK_MISS_LOGGED` | Student tags a miss from a MockRun | `mockRunId`, `engineId` (nullable), `leakType`, `description` |
| `MOCK_MISS_DRILLED` | Student manually marks a miss as drilled | `mockRunId`, `missId` — NOTE: never auto-triggered |

### 2.4 Mini Mock Events

| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `MINI_MOCK_STARTED` | MiniMockTrainer component mounts | `courseIds[]`, `questionCount`, `timeLimitSeconds` |
| `MINI_MOCK_CONTEXT_SWITCHED` | Question 1 → Question 2 (timeout or manual) | `trigger` (`TIMEOUT`/`MANUAL`), `q1ElapsedSeconds`, `q1WordCount` |
| `MINI_MOCK_SUBMITTED` | Final submission or timeout on Q2 | `q2ElapsedSeconds`, `q2WordCount` |
| `MINI_MOCK_LOCKED` | Exam window locked (both questions complete) | `totalElapsedSeconds` |

### 2.5 ChimeIn Interrupt Events (v2 Revise Mode — fenced)

| Event Type | Trigger | Key Payload Fields |
|---|---|---|
| `CHIME_IN_TRIGGERED` | Wakeword detected by useChimeInInterrupt | `wakeword`, `timestamp`, `mediaPositionMs` |
| `CHIME_IN_QUERY_SUBMITTED` | Student submits question during interrupt | `query`, `engineId` (contextual) |
| `CHIME_IN_RESUMED` | Media playback resumes | `pauseDurationMs` |

---

## 3. COHORT DIAGNOSTIC PROFILE (v2 / institutional — analyst-agent output)

Aggregated from COMMITTED LeakEntry records across a cohort (multiple pilot students
or institutional users). Produced by the analyst-agent on demand; fed to instructor
dashboard (v3) and the B2B pitch as the diagnostic-data value proposition.

```json
{
  "cohortId": "string",
  "courseId": "string",
  "generatedAt": "ISO 8601",
  "studentCount": 0,
  "leakDistribution": {
    "GATE_SKIP":  { "count": 0, "percentage": 0.0 },
    "WRONG_TOOL": { "count": 0, "percentage": 0.0 },
    "PRECISION":  { "count": 0, "percentage": 0.0 }
  },
  "dominantLeakType": "GATE_SKIP | WRONG_TOOL | PRECISION",
  "mostLeakyEngines": [
    { "engineId": "string", "engineTitle": "string", "leakCount": 0, "dominantType": "string" }
  ],
  "trend30Days": {
    "GATE_SKIP":  0,
    "WRONG_TOOL": 0,
    "PRECISION":  0
  }
}
```

---

## 4. WORKING GROUP FILE INGESTION FORMAT

When a working group uploads crowdsourced course material (syllabi, past papers,
extraction drafts) for the analyst-agent to process, files must follow this naming
and header convention so Cosmos can route them correctly.

**Filename convention:** `WG_{COURSE_CODE}_{YYYY-MM-DD}_{type}.{ext}`
Examples: `WG_EULAW_2026-09-01_syllabus.pdf`, `WG_TECHLAW_2026-09-01_pastpaper.pdf`

**Required header block (JSON front-matter comment at top of any .md draft):**
```json
{
  "wg_schema_version": "1.0.0",
  "course_code": "string",
  "institution": "RUG | OTHER",
  "academic_year": "2026-2027",
  "content_type": "SYLLABUS | PAST_PAPER | EXTRACTION_DRAFT | ENGINE_BATCH",
  "submitted_by": "string (anonymous ID or alias)",
  "submitted_at": "ISO 8601"
}
```

The analyst-agent validates this header before dispatching to the creator-agent
for engine generation. Files without a valid header are quarantined with a
`INGESTION_REJECTED` event and flagged for manual review.
