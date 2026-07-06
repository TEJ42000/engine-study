# config/settings.py
# Engine Study — Global System Constants
# Derived from COSMOS_V1_SPEC.md and CosmosWorkplace.md
# NOTE: v1 is a local-first TypeScript/React app. This file is the
# canonical Python reference for Cosmos agent context and any future
# server-side tooling. It is NOT a live backend dependency in v1.

# ── Evaluation Pipeline ──────────────────────────────────────────────────────

# Wakeword detected by the client-side SpeechRecognition listener
# (useChimeInInterrupt.ts). Value must match the transcript.includes() check.
CHIME_IN_WAKEWORD: str = "chime in"

# ── Model Routing ─────────────────────────────────────────────────────────────

# High-tier server-side generation worker (v2 AI engine generation,
# AI-marked recall). Default per COSMOS_V1_SPEC.md §4.2 model-choice note.
# As of 2026-07: claude-opus-4-8 ($5/$25 per MTok). One marking call
# ≈ 1–2K input + ~400 output tokens → well under $0.02/call.
CREATOR_AGENT_MODEL: str = "claude-opus-4-8"

# Low-credit edge validator (client-side evaluation, no server round-trip).
# Fallback for cost-sensitive marking: verify against stored human self-grades
# before downgrading from CREATOR_AGENT_MODEL.
CLIENT_EDGE_MODEL: str = "claude-haiku-4-5"

# ── v2 AI Marking ─────────────────────────────────────────────────────────────

# Max tokens for a single AI marking response (score + bullets + advice).
# Target: under 300 words per COSMOS_V1_SPEC.md §4.2.
MARKING_MAX_TOKENS: int = 500

# ── Visual Render Profile (v2 Revise Mode — DO NOT BUILD IN v1) ──────────────

# Identifier for the pre-compiled 3D asset render profile used by the
# creator-agent when batch-generating visual typography assets from syllabus
# ingestion. Fenced to v2; included here so Cosmos agent context is consistent.
VEO_RENDER_PROFILE: str = "neo_brutalist_3d_legal_v1"

# ── Maturity Ladder Constants ─────────────────────────────────────────────────
# From COSMOS_V1_SPEC.md §1.2 two-axis maturity table.

# Minimum consecutive full-recall PASSes required for FRAGILE → RELIABLE.
RELIABLE_PASS_STREAK_REQUIRED: int = 3

# Minimum hours between pass #1 and pass #3 for FRAGILE → RELIABLE upgrade.
# Enforces that no engine can be crammed to RELIABLE inside a single day.
RELIABLE_DECAY_WINDOW_HOURS: int = 48

# ── Leak Profile ──────────────────────────────────────────────────────────────

# Rolling window (days) for the per-course leak trend displayed on the dashboard.
LEAK_TREND_WINDOW_DAYS: int = 30

# ── Export / Import ───────────────────────────────────────────────────────────

# schemaVersion is the number 1 (matches COSMOS_V1_SPEC.md §0 and v1-core).
EXPORT_SCHEMA_VERSION: int = 1
EXPORT_FILENAME_PREFIX: str = "engine-study-export"
