"""Token accounting and cost arithmetic. No API key needed — the ledger is
deliberately separable from the adapter so the money math is testable."""
import pytest

from app.integrations.llm.pricing import INTRO, STANDARD, Rate, UsageLedger


def test_cost_is_per_million_tokens():
    rate = Rate(input=1.00, output=5.00)
    # 1M input + 1M output at $1/$5.
    assert rate.cost(1_000_000, 1_000_000) == pytest.approx(6.00)
    # Sub-million amounts scale linearly rather than rounding to zero.
    assert rate.cost(1_000, 500) == pytest.approx(0.0035)


def test_ledger_accumulates_per_model():
    ledger = UsageLedger()
    ledger.record("claude-haiku-4-5", 1_000, 200)
    ledger.record("claude-haiku-4-5", 500, 100)
    ledger.record("claude-sonnet-5", 2_000, 400)

    assert ledger.calls == 3
    assert ledger.input_tokens == 3_500
    assert ledger.output_tokens == 700
    assert ledger.by_model["claude-haiku-4-5"].calls == 2
    assert ledger.by_model["claude-haiku-4-5"].total_tokens == 1_800

    expected = (
        STANDARD["claude-haiku-4-5"].cost(1_500, 300)
        + STANDARD["claude-sonnet-5"].cost(2_000, 400)
    )
    assert ledger.cost() == pytest.approx(expected)


def test_intro_pricing_is_cheaper_only_for_sonnet():
    """Sonnet 5's introductory rate ends 2026-08-31. Billing at STANDARD is what
    keeps a quoted cost from expiring; this pins the difference so the two
    tables cannot silently converge."""
    ledger = UsageLedger()
    ledger.record("claude-sonnet-5", 1_000_000, 100_000)
    assert ledger.cost(INTRO) < ledger.cost(STANDARD)

    haiku = UsageLedger()
    haiku.record("claude-haiku-4-5", 1_000_000, 100_000)
    assert haiku.cost(INTRO) == pytest.approx(haiku.cost(STANDARD))


def test_unknown_model_is_surfaced_not_silently_free():
    """A model swap that outruns the rate table must be visible. Charging $0
    for it would look like a cost win instead of a stale constant."""
    ledger = UsageLedger()
    ledger.record("claude-some-future-model", 1_000_000, 1_000_000)

    assert ledger.cost() == 0.0
    assert ledger.unpriced() == ["claude-some-future-model"]


def test_reset_clears_between_runs():
    ledger = UsageLedger()
    ledger.record("claude-haiku-4-5", 100, 10)
    ledger.reset()
    assert ledger.calls == 0 and ledger.cost() == 0.0
