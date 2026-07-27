"""Real Anthropic adapter (enabled with LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY).

Model split per the project plan: Haiku 4.5 for cheap batched sentiment
classification, Sonnet 5 for theme labeling/summaries and reply drafts.
Structured output uses `output_config.format` with a JSON schema, so responses
are guaranteed-parseable JSON. Implements the same protocols as MockLLM.
"""
import json

from anthropic import AsyncAnthropic

from app.core.config import settings

SENTIMENT_MODEL = "claude-haiku-4-5"
THEME_MODEL = "claude-sonnet-5"

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

    async def score(self, texts: list[str], ratings: list[int]) -> list[tuple[float, str]]:
        numbered = "\n".join(
            f"{i + 1}. (rating {r}/5) {t}" for i, (t, r) in enumerate(zip(texts, ratings))
        )
        response = await self._client.messages.create(
            model=SENTIMENT_MODEL,
            max_tokens=8192,
            system=(
                "You score e-commerce product reviews. For each numbered review return a "
                "sentiment score from -1 (very negative) to 1 (very positive) and a label. "
                "Return results in the same order as the input."
            ),
            messages=[{"role": "user", "content": numbered}],
            output_config={"format": {"type": "json_schema", "schema": SENTIMENT_SCHEMA}},
        )
        results = _json_text(response)["results"]
        if len(results) != len(texts):
            raise ValueError(f"expected {len(texts)} sentiment results, got {len(results)}")
        return [
            (max(-1.0, min(1.0, float(r["score"]))), r["label"])
            for r in results
        ]

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
