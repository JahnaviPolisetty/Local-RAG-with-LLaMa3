from langchain_ollama import OllamaEmbeddings

from config import settings


class EmbeddingError(Exception):
    pass


def get_embedding_model() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        model=settings.embedding_model,
        base_url=settings.ollama_base_url,
    )


def embed_documents(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    try:
        return get_embedding_model().embed_documents(texts)
    except Exception as exc:
        raise EmbeddingError(
            "Embedding generation failed. Confirm Ollama is running and "
            f"the '{settings.embedding_model}' model is installed."
        ) from exc


def embed_query(text: str) -> list[float]:
    try:
        return get_embedding_model().embed_query(text)
    except Exception as exc:
        raise EmbeddingError(
            "Embedding generation failed. Confirm Ollama is running and "
            f"the '{settings.embedding_model}' model is installed."
        ) from exc
