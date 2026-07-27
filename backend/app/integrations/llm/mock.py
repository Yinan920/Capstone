"""Deterministic mock LLM: sentiment, theme labels, and reply drafts with no
API key. Sentiment blends the star rating with a small lexicon so scores track
the review text, not just the stars."""
import re
from collections import Counter

POSITIVE_WORDS = {
    "great", "love", "loved", "best", "perfect", "easy", "impressed", "recommend",
    "amazing", "excellent", "fast", "helpful", "rich", "solid", "praise", "happy",
    "beautiful", "quality", "compact", "worth",
}
NEGATIVE_WORDS = {
    "crushed", "broken", "damaged", "late", "slow", "drain", "drains", "dented",
    "torn", "missing", "cracked", "flimsy", "disappointed", "frustrating", "bad",
    "worst", "leaked", "defective", "refund", "return", "open", "delay", "delayed",
}

# Keyword → human theme label used by the canned cluster labeler.
THEME_HINTS: list[tuple[set[str], str, bool]] = [
    ({"box", "packaging", "package", "crushed", "dented", "torn", "sleeve", "sealed"}, "Packaging damage", True),
    ({"shipping", "delivery", "tracking", "arrived", "late", "days", "carrier"}, "Slow / opaque shipping", True),
    ({"battery", "charge", "charging", "drain", "drains", "power"}, "Battery drain", True),
    ({"support", "service", "replaced", "replacement", "refund", "team"}, "Support experience", False),
    ({"crema", "taste", "coffee", "espresso", "shot", "brew", "flavor"}, "Coffee quality", False),
]

_WORD_RE = re.compile(r"[a-z']+")


def _tokens(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


class MockLLM:
    async def score(self, texts: list[str], ratings: list[int]) -> list[tuple[float, str]]:
        results = []
        for text, rating in zip(texts, ratings):
            words = set(_tokens(text))
            lexicon = len(words & POSITIVE_WORDS) - len(words & NEGATIVE_WORDS)
            score = 0.55 * ((rating - 3) / 2) + 0.15 * max(-3, min(3, lexicon))
            score = round(max(-1.0, min(1.0, score)), 2)
            label = "positive" if score > 0.15 else "negative" if score < -0.15 else "neutral"
            results.append((score, label))
        return results

    async def label_cluster(self, texts: list[str], avg_sentiment: float) -> tuple[str, str, bool]:
        from app.integrations.stopwords import STOPWORDS

        counts = Counter(
            t for text in texts for t in _tokens(text) if t not in STOPWORDS and len(t) > 2
        )
        top = [w for w, _ in counts.most_common(12)][:3] or ["general feedback"]
        # Pick the theme hint with the strongest keyword presence
        best_score, best = 0, None
        for hint_words, label, complaint_hint in THEME_HINTS:
            score = sum(counts[w] for w in hint_words)
            if score > best_score:
                best_score, best = score, (label, complaint_hint)
        if best is not None and best_score >= max(2, len(texts) // 3):
            label, complaint_hint = best
            is_complaint = complaint_hint and avg_sentiment < 0.05
            mood = "Recurring complaint driver." if is_complaint else "A consistent strength buyers call out."
            summary = f"Customers frequently mention {', '.join(top)}. {mood}"
            return label, summary, is_complaint
        is_complaint = avg_sentiment < -0.15
        summary = f"Reviews centered on {', '.join(top)}."
        return f"General feedback: {top[0]}", summary, is_complaint

    async def draft_reply(self, author: str, text: str, theme_label: str | None) -> str:
        first_name = author.split(" ")[0] if author else "there"
        theme = (theme_label or "").lower()
        if "packaging" in theme:
            body = (
                f"Hi {first_name}, I'm so sorry your order arrived damaged — that's not the unboxing "
                "moment we want for you. I've flagged this batch with our fulfillment team and we're "
                "upgrading to reinforced packaging this week. I'd love to ship a free replacement right "
                "away; just reply and it's on its way, no return needed. — The NovaBrew Team"
            )
        elif "shipping" in theme:
            body = (
                f"Hi {first_name}, thank you for your patience — a slow delivery with silent tracking is "
                "genuinely frustrating and we own that. We've switched to a faster carrier with live "
                "tracking for your region, and I've added store credit to your account as an apology. "
                "— The NovaBrew Team"
            )
        elif "battery" in theme:
            body = (
                f"Hi {first_name}, appreciate you flagging the battery issue. A firmware update ships "
                "next week that fixes idle discharge — I'll email you the moment it's live. Our team can "
                "also send a replacement cell if you'd like. — The NovaBrew Team"
            )
        else:
            body = (
                f"Hi {first_name}, thank you for the honest feedback — it genuinely helps us improve. "
                "We'd love to make this right; reply here and our team will take care of you personally. "
                "— The NovaBrew Team"
            )
        return body
