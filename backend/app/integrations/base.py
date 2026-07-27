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


class EmailSender(Protocol):
    async def send_alert_email(self, to: str, theme: str, share: float, threshold: float) -> bool:
        """Send a threshold-crossed alert. Returns True if 'sent'."""
        ...
