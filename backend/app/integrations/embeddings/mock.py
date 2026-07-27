"""Deterministic keyless embeddings: each token maps to a stable pseudo-random
384-dim vector (seeded by an MD5 of the token, so results are identical across
processes); a text's embedding is the L2-normalized mean of its token vectors.
Texts sharing vocabulary get similar vectors — enough signal for KMeans."""
import hashlib
import re

import numpy as np

from app.integrations.stopwords import STOPWORDS

DIM = 384
_WORD_RE = re.compile(r"[a-z']+")
_cache: dict[str, np.ndarray] = {}


def _token_vector(token: str) -> np.ndarray:
    vec = _cache.get(token)
    if vec is None:
        seed = int.from_bytes(hashlib.md5(token.encode()).digest()[:8], "big")
        vec = np.random.default_rng(seed).standard_normal(DIM)
        _cache[token] = vec
    return vec


class MockEmbeddings:
    async def embed(self, texts: list[str]) -> list[list[float]]:
        out = []
        for text in texts:
            tokens = [
                t for t in _WORD_RE.findall(text.lower()) if t not in STOPWORDS and len(t) > 2
            ]
            if tokens:
                vec = np.mean([_token_vector(t) for t in tokens], axis=0)
            else:
                vec = np.zeros(DIM)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            out.append(vec.astype(float).tolist())
        return out
