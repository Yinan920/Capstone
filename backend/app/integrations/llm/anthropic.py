"""Real Anthropic adapter (enabled with LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY).

Model split per the project plan: Haiku 4.5 for cheap batched sentiment
classification, Sonnet 5 for theme labeling/summaries and reply drafts.
Structured output uses `output_config.format` with a JSON schema, so responses
are guaranteed-parseable JSON. Implements the same protocols as MockLLM.
"""
import asyncio
import json

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.integrations.llm.pricing import UsageLedger

SENTIMENT_MODEL = "claude-haiku-4-5"
THEME_MODEL = "claude-sonnet-5"

# Reviews per sentiment request. Small batches are what make the per-item count
# reliable; see score(). The in-flight ceiling is `settings.sentiment_concurrency`
# so it can be tuned per deployment without a rebuild.
SENTIMENT_BATCH = 25

SENTIMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "score": {"type": "number"},
                    "label": {"type": "string", "enum": ["positive", "neutral", "negative"]},
                },
                "required": ["score", "label"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["results"],
    "additionalProperties": False,
}

THEME_SCHEMA = {
    "type": "object",
    "properties": {
        "label": {"type": "string"},
        "summary": {"type": "string"},
        "is_complaint": {"type": "boolean"},
    },
    "required": ["label", "summary", "is_complaint"],
    "additionalProperties": False,
}


def _json_text(response) -> dict:
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


class AnthropicLLM:
    def __init__(self) -> None:
        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        # Every response carries its own token counts, so metering is exact
        # rather than estimated — no local tokenizer, nothing to drift out of
        # sync with the provider's own accounting.
        self.usage = UsageLedger()

    async def _create(self, **kwargs):
        """Single choke point for `messages.create` so no call can be added
        later that silently escapes metering."""
        response = await self._client.messages.create(**kwargs)
        self.usage.record(
            kwargs["model"], response.usage.input_tokens, response.usage.output_tokens
        )
        return response

    async def _score_chunk(self, texts: list[str], ratings: list[int]) -> list[tuple[float, str]]:
        numbered = "\n".join(
            f"{i + 1}. (rating {r}/5) {t}" for i, (t, r) in enumerate(zip(texts, ratings))
        )
        response = await self._create(
            model=SENTIMENT_MODEL,
            max_tokens=8192,
            system=(
                "You score e-commerce product reviews. For each numbered review return a "
                f"sentiment score from -1 (very negative) to 1 (very positive) and a label. "
                f"The input has exactly {len(texts)} reviews — return exactly "
                f"{len(texts)} results, in the same order."
            ),
            messages=[{"role": "user", "content": numbered}],
            output_config={"format": {"type": "json_schema", "schema": SENTIMENT_SCHEMA}},
        )
        results = _json_text(response)["results"]
        if len(results) != len(texts):
            raise ValueError(f"expected {len(texts)} sentiment results, got {len(results)}")
        return [(max(-1.0, min(1.0, float(r["score"]))), r["label"]) for r in results]

    async def score(self, texts: list[str], ratings: list[int]) -> list[tuple[float, str]]:
        """Score in fixed-size chunks, concurrently.

        A single call covering the whole dataset is unreliable: asked for 200
        structured results at once the model silently returns fewer, and the
        output also risks running into max_tokens. Chunking keeps each request
        small enough to be exact; chunks run concurrently so wall time stays
        close to a single call. Each chunk gets one retry before failing the job.
        """
        pairs = list(zip(texts, ratings))
        chunks = [pairs[i:i + SENTIMENT_BATCH] for i in range(0, len(pairs), SENTIMENT_BATCH)]
        sem = asyncio.Semaphore(settings.sentiment_concurrency)

        async def run(chunk):
            async with sem:
                t = [c[0] for c in chunk]
                r = [c[1] for c in chunk]
                try:
                    return await self._score_chunk(t, r)
                except (ValueError, KeyError, json.JSONDecodeError):
                    return await self._score_chunk(t, r)  # one retry

        scored = await asyncio.gather(*(run(c) for c in chunks))
        return [item for chunk_result in scored for item in chunk_result]

    async def label_cluster(self, texts: list[str], avg_sentiment: float) -> tuple[str, str, bool]:
        sample = "\n".join(f"- {t}" for t in texts[:30])
        response = await self._create(
            model=THEME_MODEL,
            max_tokens=1024,
            system=(
                "You analyze clusters of e-commerce reviews for a seller dashboard. "
                "Given reviews from one cluster, produce a short theme label (max 5 words), "
                "a one-to-two sentence summary for the seller, and whether the theme is a "
                "complaint driver."
            ),
            messages=[
                {
                    "role": "user",
                    "content": f"Cluster average sentiment: {avg_sentiment:.2f}\nReviews:\n{sample}",
                }
            ],
            output_config={"format": {"type": "json_schema", "schema": THEME_SCHEMA}},
        )
        data = _json_text(response)
        return data["label"], data["summary"], bool(data["is_complaint"])

    async def summarize_findings(self, themes: list[dict], net_sentiment: float) -> str:
        """One actionable takeaway across all themes.

        Uses the cheap model on purpose: the input is already-distilled theme
        statistics, not raw reviews, and this call sits on the analysis critical
        path — so it is scoped to add ~1 s rather than the ~3 s a Sonnet call
        costs. It is also the one call whose failure must not fail the job;
        see the caller in `pipeline._run`.
        """
        lines = "\n".join(
            f"- {t['label']}: {t['share'] * 100:.0f}% of reviews, "
            f"avg sentiment {t['avg_sentiment']:+.2f}, "
            f"{'complaint' if t['is_complaint'] else 'strength'}, "
            f"trend {t['trend']:+.0%} between the first and second half of the period"
            for t in themes
        )
        response = await self._create(
            model=SENTIMENT_MODEL,
            max_tokens=300,
            system=(
                "You advise e-commerce sellers. Given the analyzed themes from one batch "
                "of their product reviews, write ONE takeaway of at most 45 words naming "
                "the single highest-leverage action. Be concrete and reference the actual "
                "numbers given. No preamble, no bullet points, no greeting — just the "
                "takeaway itself."
            ),
            messages=[
                {
                    "role": "user",
                    "content": f"Overall net sentiment: {net_sentiment:+.2f}\nThemes:\n{lines}",
                }
            ],
        )
        return next(b.text for b in response.content if b.type == "text").strip()

    async def draft_reply(self, author: str, text: str, theme_label: str | None) -> str:
        response = await self._create(
            model=THEME_MODEL,
            max_tokens=1024,
            system=(
                "You write warm, accountable, on-brand seller replies to customer reviews "
                "for the NovaBrew coffee brand. Keep it under 120 words, address the "
                "specific issue, offer a concrete remedy, and sign off as 'The NovaBrew Team'."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Review by {author}"
                        + (f" (theme: {theme_label})" if theme_label else "")
                        + f":\n{text}"
                    ),
                }
            ],
        )
        return next(b.text for b in response.content if b.type == "text").strip()
