"""Optional local sentence-transformers provider (all-MiniLM-L6-v2, 384-dim).
No API key, but downloads the model on first use. Enable with
EMBEDDINGS_PROVIDER=st and `pip install -e ".[st]"`."""
import asyncio


class SentenceTransformerEmbeddings:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer  # lazy heavy import

        self._model = SentenceTransformer(model_name)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_running_loop()
        vectors = await loop.run_in_executor(
            None, lambda: self._model.encode(texts, normalize_embeddings=True)
        )
        return [v.tolist() for v in vectors]
