"""Provider protocols. Real and mock implementations are interchangeable;
`app.integrations.providers` picks one from settings."""
from typing import Protocol


class SentimentScorer(Protocol):
    async def score(self, texts: list[str], ratings: list[int]) -> list[tuple[float, str]]:
        """Return (score in -1..1, label) per text."""
        ...


class ThemeLabeler(Protocol):
    async def label_cluster(
        self, texts: list[str], avg_sentiment: float
    ) -> tuple[str, str, bool]:
        """Return (label, summary, is_complaint) for one cluster of review texts."""
        ...


class EmbeddingProvider(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one 384-dim vector per text."""
        ...


class ReplyDrafter(Protocol):
    async def draft_reply(self, author: str, text: str, theme_label: str | None) -> str:
        """Return a brand-tone reply body for a review."""
        ...


class FindingsSummarizer(Protocol):
    async def summarize_findings(self, themes: list[dict], net_sentiment: float) -> str:
        """Return one actionable sentence for the seller across all themes.

        Each theme dict carries `label`, `share`, `avg_sentiment`, `trend` and
        `is_complaint` — enough to say which problem is worth acting on first,
        without re-reading the reviews.
        """
        ...
