from pathlib import Path

from database import add_history
from embeddings import EmbeddingError
from llm import LLMError, generate_answer
from vector_store import VectorStoreError, get_vector_store


class RAGError(Exception):
    pass


class NoDocumentsIndexedError(RAGError):
    pass


class NoRelevantContextError(RAGError):
    pass


def _page_value(value):
    if value in (None, "", "null"):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return value


def _source_detail(result) -> dict:
    metadata = result.metadata or {}
    filename = Path(str(metadata.get("filename") or metadata.get("document_name") or "Unknown document")).name
    text = result.text.strip()
    return {
        "filename": filename,
        "document": filename,
        "document_name": filename,
        "source_file": Path(str(metadata.get("source_file") or filename)).name,
        "page": _page_value(metadata.get("page")),
        "page_number": _page_value(metadata.get("page")),
        "chunk": metadata.get("chunk"),
        "chunk_id": metadata.get("chunk_id") or f"{filename}:{metadata.get('chunk', '')}",
        "text": text,
        "relevant_chunk": text[:700],
        "distance": result.distance,
    }


def answer_question(
    db,
    question: str,
    document_filters: list[str] | None = None,
    session_id: int | None = None,
) -> dict:
    clean_question = question.strip()
    if not clean_question:
        raise RAGError("Question cannot be empty.")

    selected_documents = [name for name in (document_filters or []) if name]
    vector_store = get_vector_store()
    if vector_store.count() == 0:
        raise NoDocumentsIndexedError("No documents have been indexed yet.")

    results = vector_store.search(clean_question, document_filters=selected_documents or None)
    if not results:
        raise NoRelevantContextError(
            "No relevant context was found in the selected indexed documents."
        )

    context_blocks = []
    source_details: list[dict] = []
    source_names: list[str] = []
    for result in results:
        detail = _source_detail(result)
        source_details.append(detail)
        source_names.append(detail["filename"])
        page_label = detail["page"] if detail["page"] is not None else "not available"
        context_blocks.append(
            f"Source: {detail['filename']}\n"
            f"Page: {page_label}\n"
            f"Chunk: {detail['chunk_id']}\n"
            f"Text: {result.text}"
        )

    answer = generate_answer(clean_question, "\n\n---\n\n".join(context_blocks))
    history = add_history(
        db,
        clean_question,
        answer,
        source_names,
        source_details=source_details,
        session_id=session_id,
    )

    return {
        "id": history.id,
        "session_id": history.session_id,
        "question": clean_question,
        "answer": answer,
        "sources": source_details,
        "referenced_documents": sorted(set(source_names)),
        "context_count": len(results),
        "created_at": history.created_at.isoformat(),
    }


__all__ = [
    "EmbeddingError",
    "LLMError",
    "NoDocumentsIndexedError",
    "NoRelevantContextError",
    "RAGError",
    "VectorStoreError",
    "answer_question",
]
