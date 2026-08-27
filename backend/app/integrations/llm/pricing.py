"""Token accounting and per-run cost for the Anthropic adapter.

Rates are USD per million tokens, taken from Anthropic's published pricing and
dated so a stale number is visible rather than silently wrong. Two things worth
knowing before quoting any figure produced here:

  * `claude-sonnet-5` carries an introductory rate ($2/$10) that ends
    2026-08-31, after which it is $3/$15. `STANDARD` is what this module bills
    at, so a cost quoted today still holds next month; `INTRO` is kept only so
    the two can be compared.
  * These are first-party API rates. Bedrock and Vertex are partner-operated
    and priced separately.
"""
from dataclasses import dataclass, field

PRICING_AS_OF = "2026-08-27"


@dataclass(frozen=True)
class Rate:
    """USD per million tokens."""

    input: float
    output: float

    def cost(self, input_tokens: int, output_tokens: int) -> float:
        return (input_tokens * self.input + output_tokens * self.output) / 1_000_000


# Billed at standard rates on purpose — see the module docstring.
STANDARD: dict[str, Rate] = {
    "claude-haiku-4-5": Rate(input=1.00, output=5.00),
    "claude-sonnet-5": Rate(input=3.00, output=15.00),
}

# Sonnet 5's introductory pricing, for comparison only. Ends 2026-08-31.
INTRO: dict[str, Rate] = {
    "claude-haiku-4-5": Rate(input=1.00, output=5.00),
    "claude-sonnet-5": Rate(input=2.00, output=10.00),
}


@dataclass
class ModelUsage:
    calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class UsageLedger:
    """Per-model token totals for one analysis run.

    The adapter records into this; callers snapshot and reset it. Kept separate
    from the adapter so the accounting is testable without an API key, and so
    persisting per-job cost later is a matter of reading this rather than
    threading counters through the pipeline.
    """

    by_model: dict[str, ModelUsage] = field(default_factory=dict)

    def record(self, model: str, input_tokens: int, output_tokens: int) -> None:
        entry = self.by_model.setdefault(model, ModelUsage())
        entry.calls += 1
        entry.input_tokens += input_tokens
        entry.output_tokens += output_tokens

    def reset(self) -> None:
        self.by_model.clear()

    @property
    def calls(self) -> int:
        return sum(u.calls for u in self.by_model.values())

    @property
    def input_tokens(self) -> int:
        return sum(u.input_tokens for u in self.by_model.values())

    @property
    def output_tokens(self) -> int:
        return sum(u.output_tokens for u in self.by_model.values())

    def cost(self, rates: dict[str, Rate] | None = None) -> float:
        """Total USD. Unknown models cost 0 and are surfaced by `unpriced()`
        rather than silently guessed at."""
        table = rates if rates is not None else STANDARD
        return sum(
            table[model].cost(u.input_tokens, u.output_tokens)
            for model, u in self.by_model.items()
            if model in table
        )

    def unpriced(self) -> list[str]:
        """Models seen but absent from the rate table — a rate table that has
        gone stale against a model swap shows up here instead of as $0.00."""
        return sorted(m for m in self.by_model if m not in STANDARD)
