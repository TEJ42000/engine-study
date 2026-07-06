# src/core/taxonomy.py
# Engine Study — Execution Failure Taxonomy Enums
# Derived from COSMOS_V1_SPEC.md §1.4 (LeakEntry) and AISystemPrompts.md.
# These are the canonical Python representations of the TypeScript union types
# used in the v1 data model. Cosmos agents must use these values verbatim
# when generating evaluation payloads or LeakEntry records.

from enum import Enum


class FailureMode(str, Enum):
    """
    The three mutually exclusive execution failure types.

    GATE_SKIP    — Student advanced to a final conclusion or remedy BEFORE
                   satisfying a foundational threshold gate (procedural,
                   jurisdictional, or definition-level). Flagged even if the
                   final conclusion is legally correct.

    WRONG_TOOL   — Student deployed an incorrect statute, regulation, or
                   rule-set to the fact pattern. The routing decision was wrong.
                   Maps to the 'wrong-tool question' encoded in each engine's
                   `gate` field.

    PRECISION    — Student identified the correct framework and cleared the gate
                   but named an incorrect subsection, paragraph, threshold
                   qualifier, or binding precedent. Example: recalling "household
                   exception" without the verbatim qualifier "PURELY PERSONAL and
                   household activities" (Lindqvist / Ryneš).
    """
    GATE_SKIP  = "GATE_SKIP"
    WRONG_TOOL = "WRONG_TOOL"
    PRECISION  = "PRECISION"


class LeakStatus(str, Enum):
    """
    Whether the failure was actually committed or merely guarded against.

    COMMITTED — The student made this error in a recorded session or mock.
                Only COMMITTED leaks feed the per-course leak profile.

    GUARDED   — The engine's gate is explicitly defending against this risk,
                but the student has not yet committed the error. Informs gate
                prominence; does NOT feed drill-weighting or the leak profile.
    """
    COMMITTED = "COMMITTED"
    GUARDED   = "GUARDED"


class LeakSource(str, Enum):
    """
    Which session type produced this leak record.

    COLD_TEST       — Arose during a FULL_RECALL TestSession.
    PRECISION_CHECK — Arose during a PRECISION_CHECK TestSession.
    MOCK            — Arose during a MockRun (applied fact-pattern context).
    MANUAL          — Manually logged by the user outside a timed session.
    """
    COLD_TEST       = "COLD_TEST"
    PRECISION_CHECK = "PRECISION_CHECK"
    MOCK            = "MOCK"
    MANUAL          = "MANUAL"


class RetrievalReliability(str, Enum):
    """
    The retrieval-reliability axis of the two-axis maturity model.
    Advances only via recorded results — never automatically.

    UNTESTED  — Engine has never been cold-tested.
    FRAGILE   — Engine has been tested at least once. Any FAIL resets here.
    RELIABLE  — Engine has 3 consecutive full-recall PASSes, with the 3rd
                at least 48h after the 1st (see settings.RELIABLE_DECAY_WINDOW_HOURS).
                A failed PRECISION_CHECK demotes RELIABLE → FRAGILE.
                A passed PRECISION_CHECK never promotes (asymmetric by design).
    """
    UNTESTED  = "UNTESTED"
    FRAGILE   = "FRAGILE"
    RELIABLE  = "RELIABLE"


class Comprehension(str, Enum):
    """
    The comprehension axis of the two-axis maturity model.
    Advanced only via end-of-session self-mark; user may flip SOLID → SHAKY
    at any time from the editor (doubt is always allowed in).
    """
    SHAKY = "SHAKY"
    SOLID = "SOLID"


class EngineType(str, Enum):
    """
    Whether the engine encodes a legal doctrine / rule-sequence (DOCTRINAL)
    or an answer-structure template (ANSWER_STRUCTURE, e.g. DAEN, IRAC).
    Default is DOCTRINAL.
    """
    DOCTRINAL       = "DOCTRINAL"
    ANSWER_STRUCTURE = "ANSWER_STRUCTURE"


class SessionMode(str, Enum):
    """
    The two drill modes. Determines which maturity axes are updated
    and whether gateAttempt and comprehensionAfter are required.
    """
    FULL_RECALL     = "FULL_RECALL"
    PRECISION_CHECK = "PRECISION_CHECK"
