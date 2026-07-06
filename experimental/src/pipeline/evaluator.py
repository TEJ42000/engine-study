# src/pipeline/evaluator.py
# Engine Study — ActiveDrillEvaluator
# Executes the zero-flattery evaluation contract defined in AISystemPrompts.md.
# In v1 this class is a blueprint / contract reference for Cosmos agents.
# The actual evaluation in v1 is user-self-marked (no AI calls in v1).
# In v2 this class drives the AI-marked recall loop (COSMOS_V1_SPEC.md §4.2).

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from src.core.taxonomy import (
    Comprehension,
    EngineType,
    FailureMode,
    LeakSource,
    LeakStatus,
    RetrievalReliability,
    SessionMode,
)
from config.settings import (
    CREATOR_AGENT_MODEL,
    MARKING_MAX_TOKENS,
    RELIABLE_DECAY_WINDOW_HOURS,
    RELIABLE_PASS_STREAK_REQUIRED,
)


# ── Evaluation Input ──────────────────────────────────────────────────────────

@dataclass
class EvaluationRequest:
    """
    All inputs required for a single drill evaluation.

    core_course       : e.g. "European Internal Market Law"
    sub_topic         : e.g. "Quantitative Restrictions / MEQRs"
    engine_id         : Reference ID to the Engine being tested
    session_mode      : FULL_RECALL or PRECISION_CHECK
    rubric_checklist  : Ordered list of required sequential logic parameters.
                        Each item is a dict with keys:
                          step_index  : int
                          description : str (the mandatory gate or step)
                          is_gate     : bool (True = threshold gate; skip = GATE_SKIP)
    student_input     : Raw typed or transcribed student response
    exam_profile_flags: Dict of ExamProfile booleans from the Course record
    """
    core_course:        str
    sub_topic:          str
    engine_id:          str
    session_mode:       SessionMode
    rubric_checklist:   list[dict[str, Any]]
    student_input:      str
    exam_profile_flags: dict[str, Any] = field(default_factory=dict)


# ── Evaluation Output ─────────────────────────────────────────────────────────

@dataclass
class FailureDetail:
    failure_mode:  FailureMode
    step_index:    int
    description:   str          # What the student did / failed to do
    expected:      str          # What was required at this step


@dataclass
class EvaluationResult:
    """
    Schema-validated output payload. Maps directly to the Execution Failure
    Taxonomy. Cosmos agents must emit this shape — zero markdown prose,
    clean JSON serialisation only.

    session_id      : Caller-assigned ID (matches TestSession.id in the store)
    engine_id       : Echoed from the request
    result          : PASS or FAIL
    score_out_of_10 : Integer 0–10; AI-assigned in v2, self-assigned in v1
    failures        : Empty list on a clean PASS
    leak_entries    : LeakEntry payloads ready for store insertion
    feedback_blocks : The five-part feedback structure (v2 only; null in v1)
    evaluated_at    : ISO 8601 UTC timestamp
    """
    session_id:       str
    engine_id:        str
    result:           str                       # "PASS" | "FAIL"
    score_out_of_10:  int
    failures:         list[FailureDetail]       # empty on PASS
    leak_entries:     list[dict[str, Any]]      # ready-to-insert LeakEntry dicts
    feedback_blocks:  dict[str, Any] | None     # v2 AI feedback; None in v1
    evaluated_at:     str


# ── Evaluator ─────────────────────────────────────────────────────────────────

class ActiveDrillEvaluator:
    """
    Zero-flattery evaluation engine.

    v1 behaviour: execute_zero_flattery_evaluation() raises NotImplementedError
    because v1 has no AI calls. Self-marking is handled in the UI layer.
    This class exists so Cosmos can implement it in v2 by filling in the
    _call_marking_api() method without changing the contract.

    v2 behaviour: calls the Anthropic API with the strict examiner system
    prompt, receives structured JSON, validates it, and returns EvaluationResult.
    """

    # ── System prompt (THE ZERO-FLATTERY MANDATE) ─────────────────────────────
    # From AISystemPrompts.md. Parameterised at call time with course/topic/rubric.
    _SYSTEM_PROMPT_TEMPLATE: str = """
ROLE:
You are an unyielding, elite academic examiner for European and Dutch WO-level law programs. Your primary objective is to evaluate a student's vocal or typed response to a multi-layered legal problem question. You are entirely immune to conversational fluff, pseudo-legal jargon, or generalized conceptual explanations. You grade strictly on the structural order of operations and the presence of logical threshold gates.

EVALUATION METHODOLOGY (THE ZERO-FLATTERY MANDATE):
- You do not flatter, encourage, or validate partial credit with conversational politeness.
- You evaluate the student's response against the hard-coded, sequential Boolean Checklist provided below (TRUE/FALSE) of mandatory legal elements.
- If a student states a final conclusion or remedy before satisfying a foundational threshold gate (procedural, jurisdictional, or definition-level), you MUST automatically flag this as a GATE_SKIP failure, regardless of whether their final conclusion happens to be legally correct.

RUBRIC CHECKLIST:
{rubric_json}

OUTPUT FORMAT:
Return ONLY clean JSON. Zero markdown prose. Zero preamble. Zero closing remarks.
Your JSON must conform exactly to this schema:

{{
  "result": "PASS" | "FAIL",
  "score_out_of_10": <integer 0-10>,
  "what_you_got_right": [<string>, ...],       // 2-4 bullets; empty list on total fail
  "what_was_missing_or_wrong": [<string>, ...], // 2-4 bullets; empty list on clean PASS
  "answer_structure_check": <string>,           // Did they answer directly? Name authority? Stop when done?
  "one_key_thing_to_add": <string>,
  "failures": [
    {{
      "failure_mode": "GATE_SKIP" | "WRONG_TOOL" | "PRECISION",
      "step_index": <int>,
      "description": <string>,
      "expected": <string>
    }}
  ]
}}

Under 300 words total across all string fields.
Flag vague terms where precision was required — this drives PRECISION leak logging.
""".strip()

    def __init__(self, model: str = CREATOR_AGENT_MODEL) -> None:
        self.model = model

    # ── Public entry point ────────────────────────────────────────────────────

    def execute_zero_flattery_evaluation(
        self,
        request: EvaluationRequest,
        session_id: str,
    ) -> EvaluationResult:
        """
        v1: raises NotImplementedError — no AI calls in v1. Self-marking only.
        v2: calls _call_marking_api(), validates, builds EvaluationResult.
        """
        raise NotImplementedError(
            "AI evaluation is a v2 feature. "
            "v1 uses user self-marking. See COSMOS_V1_SPEC.md §3 (What NOT to build)."
        )

    # ── v2 implementation skeleton ────────────────────────────────────────────

    def _build_system_prompt(self, rubric_checklist: list[dict]) -> str:
        return self._SYSTEM_PROMPT_TEMPLATE.format(
            rubric_json=json.dumps(rubric_checklist, indent=2)
        )

    def _call_marking_api(
        self,
        system_prompt: str,
        core_course: str,
        sub_topic: str,
        student_input: str,
    ) -> dict[str, Any]:
        """
        v2: POST to Anthropic /v1/messages.
        Returns parsed JSON dict matching the output schema above.
        Raises ValueError on malformed response.

        Key implementation notes (COSMOS_V1_SPEC.md §4.2):
        - Use structured output (JSON schema) so no regex parsing is needed.
        - Default to CREATOR_AGENT_MODEL (claude-opus-4-8); fall back to
          claude-sonnet-4-6 or claude-haiku-4-5 only after eval against
          stored human self-grades confirms quality parity.
        - One marking call ≈ 1–2K input + ~400 output tokens → < $0.02/call.
        - API key: user-supplied, entered in settings UI; single-user local-first.
          If Cosmos goes multi-user, route through a thin server proxy instead.
        """
        raise NotImplementedError("Implement in v2. See COSMOS_V1_SPEC.md §4.2.")

    def _build_leak_entries(
        self,
        engine_id: str,
        course_id: str,
        failures: list[FailureDetail],
        source: LeakSource,
    ) -> list[dict[str, Any]]:
        """
        Convert FailureDetail items into ready-to-insert LeakEntry dicts.
        All AI-detected failures are COMMITTED (the student actually made them).
        """
        import uuid
        entries = []
        for f in failures:
            entries.append({
                "id":          str(uuid.uuid4()),
                "engineId":    engine_id,
                "courseId":    course_id,
                "type":        f.failure_mode.value,
                "status":      LeakStatus.COMMITTED.value,
                "source":      source.value,
                "description": f.description,
                "createdAt":   datetime.now(timezone.utc).isoformat(),
            })
        return entries

    # ── Maturity state machine (v1 + v2) ─────────────────────────────────────

    @staticmethod
    def compute_maturity_transition(
        current_reliability: RetrievalReliability,
        current_pass_streak: int,
        first_pass_at: datetime | None,
        result: str,                   # "PASS" | "FAIL"
        session_mode: SessionMode,
        recorded_at: datetime,
    ) -> dict[str, Any]:
        """
        Pure function: given current state + new result, returns the updated
        maturity fields. No side effects. Called by the UI store handler.

        Rules (COSMOS_V1_SPEC.md §1.2 / DECISIONS.md 2026-07-05):
        - FULL_RECALL PASS: increment passStreak; check FRAGILE→RELIABLE upgrade.
        - FULL_RECALL FAIL: set FRAGILE (from any state); reset passStreak to 0.
        - PRECISION_CHECK FAIL: demote RELIABLE→FRAGILE; passStreak unchanged.
        - PRECISION_CHECK PASS: no maturity change (asymmetric by design).
        - FRAGILE→RELIABLE requires passStreak == REQUIRED and elapsed hours >= 48.
        """
        new_reliability = current_reliability
        new_streak      = current_pass_streak

        if session_mode == SessionMode.FULL_RECALL:
            if result == "PASS":
                new_streak += 1
                if (
                    current_reliability != RetrievalReliability.RELIABLE
                    and new_streak >= RELIABLE_PASS_STREAK_REQUIRED
                    and first_pass_at is not None
                ):
                    elapsed = (recorded_at - first_pass_at).total_seconds() / 3600
                    if elapsed >= RELIABLE_DECAY_WINDOW_HOURS:
                        new_reliability = RetrievalReliability.RELIABLE
                    else:
                        new_reliability = RetrievalReliability.FRAGILE
                elif current_reliability == RetrievalReliability.UNTESTED:
                    new_reliability = RetrievalReliability.FRAGILE
            else:  # FAIL
                new_reliability = RetrievalReliability.FRAGILE
                new_streak      = 0

        elif session_mode == SessionMode.PRECISION_CHECK:
            if result == "FAIL":
                if current_reliability == RetrievalReliability.RELIABLE:
                    new_reliability = RetrievalReliability.FRAGILE
            # PASS: no change (asymmetric)

        return {
            "retrievalReliability": new_reliability.value,
            "passStreak":           new_streak,
        }
