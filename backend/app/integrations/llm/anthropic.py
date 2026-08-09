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

SENTIMENT_MODEL = "claude-haiku-4-5"
THEME_MODEL = "claude-sonnet-5"

# Reviews per sentiment request, and how many requests may be in flight at once.
# Small batches are what make the per-item count reliable; see score().
SENTIMENT_BATCH = 25
SENTIMENT_CONCURRENCY = 4

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

    async def _score_chunk(self, texts: list[str], ratings: list[int]) -> list[tuple[float, str]]:
        numbered = "\n".join(
            f"{i + 1}. (rating {r}/5) {t}" for i, (t, r) in enumerate(zip(texts, ratings))
        )
        response = await self._client.messages.create(
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
        sem = asyncio.Semaphore(SENTIMENT_CONCURRENCY)

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
        response = await self._client.messages.create(
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

    async def draft_reply(self, author: str, text: str, theme_label: str | None) -> str:
        response = await self._client.messages.create(
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
