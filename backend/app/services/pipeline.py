"""The async AI analysis pipeline.

Runs in a background job (see app/workers). Owns its own DB session. Steps:
sentiment → embeddings → KMeans theme clustering → LLM labels/summaries →
TF-IDF complaint keywords → alert rule engine → job done. Progress is
committed after each step so GET /jobs/{id} shows live movement.
"""
import logging
import uuid
from collections import Counter
from datetime import datetime, timezone

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import CountVectorizer

from app.core.config import settings
from app.db.session import async_session_factory
from app.integrations.providers import get_email_sender, get_embedder, get_llm
from app.models import AnalysisJob, Dataset, FeedbackAlert, KeywordStat, Review, ThemeCluster, User

logger = logging.getLogger(__name__)


def _pick_k(n_reviews: int) -> int:
    if n_reviews < 8:
        return min(2, n_reviews)
    return min(5, max(2, n_reviews // 10))


def _severity(share: float, threshold: float) -> str | None:
    if share >= threshold + 0.05:
        return "critical"
    if share >= threshold:
        return "serious"
    if share >= threshold - 0.02:
        return "warning"
    return None


async def run_analysis(job_id: uuid.UUID) -> None:
    async with async_session_factory() as db:
        job = await db.get(AnalysisJob, job_id)
        if job is None:
            logger.error("analysis job %s not found", job_id)
            return
        try:
            await _run(db, job)
        except Exception as exc:  # job must never crash the server
            logger.exception("analysis job %s failed", job_id)
            job.status = "failed"
            job.error = str(exc)
            job.finished_at = datetime.now(timezone.utc)
            await db.commit()


async def _progress(db, job: AnalysisJob, value: int) -> None:
    job.progress = value
    await db.commit()


async def _run(db, job: AnalysisJob) -> None:
    from sqlalchemy import select

    job.status = "running"
    job.started_at = datetime.now(timezone.utc)
    await _progress(db, job, 5)

    dataset = await db.get(Dataset, job.dataset_id)
    reviews = list(
        (await db.scalars(select(Review).where(Review.dataset_id == dataset.id).order_by(Review.created_at))).all()
    )
    if not reviews:
        raise ValueError("Dataset has no reviews to analyze")

    llm = get_llm()
    embedder = get_embedder()
    texts = [r.text for r in reviews]

    # 1. Sentiment
    scores = await llm.score(texts, [r.rating for r in reviews])
    for review, (score, label) in zip(reviews, scores):
        review.sentiment_score = score
        review.sentiment_label = label
    await _progress(db, job, 30)

    # 2. Embeddings (stored in pgvector)
    vectors = await embedder.embed(texts)
    for review, vec in zip(reviews, vectors):
        review.embedding = vec
    await _progress(db, job, 50)

    # 3. KMeans theme clustering
    k = _pick_k(len(reviews))
    matrix = np.array(vectors)
    labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(matrix)
    await _progress(db, job, 65)

    # 4. Label + summarize each cluster; compute share/trend; assign theme_id
    midpoint = len(reviews) // 2  # reviews are date-ordered: first half vs second half
    complaint_themes: list[ThemeCluster] = []
    for cluster_idx in range(k):
        members = [r for r, c in zip(reviews, labels) if c == cluster_idx]
        if not members:
            continue
        avg_sentiment = float(np.mean([r.sentiment_score for r in members]))
        share = len(members) / len(reviews)
        early = sum(1 for r, c in zip(reviews[:midpoint], labels[:midpoint]) if c == cluster_idx)
        late = sum(1 for r, c in zip(reviews[midpoint:], labels[midpoint:]) if c == cluster_idx)
        early_share = early / max(1, midpoint)
        late_share = late / max(1, len(reviews) - midpoint)
        label_text, summary, is_complaint = await llm.label_cluster([r.text for r in members], avg_sentiment)
        theme = ThemeCluster(
            dataset_id=dataset.id,
            label=label_text,
            summary=summary,
            review_count=len(members),
            share=round(share, 4),
            avg_sentiment=round(avg_sentiment, 4),
            is_complaint=is_complaint,
            trend=round(late_share - early_share, 4),
        )
        db.add(theme)
        await db.flush()  # get theme.id for FK assignment
        for member in members:
            member.theme_id = theme.id
        if is_complaint:
            complaint_themes.append(theme)
    await _progress(db, job, 80)

    # 5. High-frequency keywords (counts over negative vs positive reviews)
    for sentiment_group, keyword_sentiment, top_n in (
        ("negative", "negative", 5),
        ("positive", "positive", 4),
    ):
        group_texts = [r.text for r in reviews if r.sentiment_label == sentiment_group]
        for term, count in _top_terms(group_texts, top_n):
            db.add(KeywordStat(dataset_id=dataset.id, term=term, count=count, sentiment=keyword_sentiment))
    await _progress(db, job, 90)

    # 6. Alert rule engine: complaint theme share vs threshold
    user = await db.get(User, dataset.user_id)
    email_sender = get_email_sender()
    for theme in complaint_themes:
        severity = _severity(theme.share, settings.alert_threshold)
        if severity is None:
            continue
        emailed_to = None
        if severity in ("serious", "critical"):
            if await email_sender.send_alert_email(user.email, theme.label, theme.share, settings.alert_threshold):
                emailed_to = user.email
        db.add(
            FeedbackAlert(
                user_id=user.id,
                dataset_id=dataset.id,
                theme=theme.label,
                severity=severity,
                share=theme.share,
                threshold=settings.alert_threshold,
                previous_share=max(0.0, round(theme.share - theme.trend, 4)),
                window_days=settings.alert_window_days,
                sample_reviews=[
                    r.text[:200]
                    for r in reviews
                    if r.theme_id == theme.id and r.sentiment_label == "negative"
                ][:3],
                email_sent_to=emailed_to,
            )
        )
    await _progress(db, job, 95)

    job.status = "done"
    job.progress = 100
    job.finished_at = datetime.now(timezone.utc)
    await db.commit()


def _top_terms(texts: list[str], top_n: int) -> list[tuple[str, int]]:
    """Most frequent 1–2 word terms across texts (stopwords removed)."""
    if not texts:
        return []
    try:
        vectorizer = CountVectorizer(ngram_range=(1, 2), stop_words="english", min_df=2)
        matrix = vectorizer.fit_transform(texts)
    except ValueError:  # all terms filtered out (tiny corpora)
        try:
            vectorizer = CountVectorizer(ngram_range=(1, 2), stop_words="english", min_df=1)
            matrix = vectorizer.fit_transform(texts)
        except ValueError:
            return []
    counts = np.asarray(matrix.sum(axis=0)).ravel()
    terms = vectorizer.get_feature_names_out()
    ranked = Counter(dict(zip(terms, counts))).most_common(top_n * 3)
    # Prefer bigrams over their component unigrams for readability
    result: list[tuple[str, int]] = []
    taken: set[str] = set()
    for term, count in ranked:
        if any(term != other and term in other for other, _ in ranked if " " in other):
            continue  # skip unigram absorbed by a kept bigram
        if term not in taken:
            result.append((term, int(count)))
            taken.add(term)
        if len(result) >= top_n:
            break
    return result
