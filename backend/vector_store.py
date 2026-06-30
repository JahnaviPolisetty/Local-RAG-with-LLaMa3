from dataclasses import dataclass
from typing import Any

import chromadb
from chromadb.errors import ChromaError

from config import settings
from embeddings import EmbeddingError, embed_documents, embed_query


class VectorStoreError(Exception):
    pass


@dataclass
class SearchResult:
    text: str
    metadata: dict[str, Any]
    distance: float | None


class ChromaVectorStore:
    def __init__(self) -> None:
        try:
            self.client = chromadb.PersistentClient(path=str(settings.chroma_dir))
            self.collection = self.client.get_or_create_collection(
                name=settings.chroma_collection,
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as exc:
            raise VectorStoreError("Could not initialize ChromaDB.") from exc

    def add_chunks(self, chunks: list[dict]) -> None:
        if not chunks:
            raise VectorStoreError("No chunks were produced for indexing.")

        texts = [chunk["text"] for chunk in chunks]
        try:
            vectors = embed_documents(texts)
            self.collection.add(
                ids=[chunk["id"] for chunk in chunks],
                documents=texts,
                embeddings=vectors,
                metadatas=[chunk["metadata"] for chunk in chunks],
            )
        except EmbeddingError:
            raise
        except Exception as exc:
            raise VectorStoreError("Could not add document chunks to ChromaDB.") from exc

    def search(
        self,
        question: str,
        k: int | None = None,
        document_filters: list[str] | None = None,
    ) -> list[SearchResult]:
        try:
            query_vector = embed_query(question)
            query_kwargs = {
                "query_embeddings": [query_vector],
                "n_results": k or settings.retrieval_k,
                "include": ["documents", "metadatas", "distances"],
            }
            if document_filters:
                query_kwargs["where"] = {"filename": {"$in": document_filters}}
            response = self.collection.query(**query_kwargs)
        except EmbeddingError:
            raise
        except Exception as exc:
            raise VectorStoreError("Could not query ChromaDB.") from exc

        documents = response.get("documents", [[]])[0] or []
        metadatas = response.get("metadatas", [[]])[0] or []
        distances = response.get("distances", [[]])[0] or []

        results: list[SearchResult] = []
        for index, document in enumerate(documents):
            distance = distances[index] if index < len(distances) else None
            metadata = metadatas[index] if index < len(metadatas) else {}
            if distance is None or distance <= settings.max_relevance_distance:
                results.append(SearchResult(text=document, metadata=metadata, distance=distance))
        return results

    def delete_document(self, filename: str) -> None:
        try:
            self.collection.delete(where={"filename": filename})
        except ChromaError as exc:
            raise VectorStoreError(f"Could not delete '{filename}' from ChromaDB.") from exc

    def delete_all(self) -> None:
        try:
            existing = self.collection.get(include=[])
            ids = existing.get("ids", [])
            if ids:
                self.collection.delete(ids=ids)
        except Exception as exc:
            raise VectorStoreError("Could not clear ChromaDB documents.") from exc

    def count(self) -> int:
        try:
            return self.collection.count()
        except Exception as exc:
            raise VectorStoreError("Could not count ChromaDB documents.") from exc


def get_vector_store() -> ChromaVectorStore:
    return ChromaVectorStore()
