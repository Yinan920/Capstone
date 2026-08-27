"""Provider factories: pick real or mock implementations from settings.
Everything defaults to keyless mocks; env vars flip to real providers with no
code changes anywhere else."""
from functools import lru_cache

from app.core.config import settings
from app.integrations.embeddings.mock import MockEmbeddings
from app.integrations.llm.mock import MockLLM


@lru_cache
def get_llm():
    """LLM provider: sentiment scoring, theme labeling, takeaways, reply drafts."""
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        from app.integrations.llm.anthropic import AnthropicLLM

        return AnthropicLLM()
    return MockLLM()


@lru_cache
def get_embedder():
    if settings.embeddings_provider == "st":
        from app.integrations.embeddings.st import SentenceTransformerEmbeddings

        return SentenceTransformerEmbeddings()
    return MockEmbeddings()
