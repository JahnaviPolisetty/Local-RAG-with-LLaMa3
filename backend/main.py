from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen
import json

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from config import settings
from database import (
    add_document,
    clear_documents,
    clear_history,
    create_session,
    delete_document_record,
    get_db,
    get_document,
    get_session_messages,
    init_db,
    list_documents,
    list_history,
    list_sessions,
)
from document_loader import (
    DocumentLoadError,
    UnsupportedDocumentError,
    chunk_parts,
    extract_parts,
    validate_supported_file,
)
from embeddings import EmbeddingError
from rag import (
    LLMError,
    NoDocumentsIndexedError,
    NoRelevantContextError,
    RAGError,
    VectorStoreError,
    answer_question,
)
from vector_store import get_vector_store


app = FastAPI(title=settings.app_name, version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    document_filters: list[str] = Field(default_factory=list)
    selected_documents: list[str] = Field(default_factory=list)
    session_id: int | None = None


@app.on_event("startup")
def startup() -> None:
    init_db()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)


def _save_upload(file: UploadFile, filename: str) -> tuple[Path, int]:
    destination = settings.upload_dir / filename
    bytes_written = 0
    try:
        with destination.open("wb") as output:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                bytes_written += len(chunk)
                if bytes_written > settings.max_upload_size_bytes:
                    output.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds {settings.max_upload_size_mb} MB limit.",
                    )
                output.write(chunk)
    finally:
        file.file.close()
    return destination, bytes_written


def _index_upload(file: UploadFile, db: Session) -> dict:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Upload must include a filename.")

    original_filename = Path(file.filename).name
    try:
        validate_supported_file(original_filename)
    except UnsupportedDocumentError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc

    if get_document(db, original_filename):
        raise HTTPException(
            status_code=409,
            detail=f"Document '{original_filename}' has already been uploaded.",
        )

    destination, bytes_written = _save_upload(file, original_filename)
    if bytes_written == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Uploaded file '{original_filename}' is empty.")

    try:
        parts = extract_parts(destination)
        chunks = chunk_parts(parts, original_filename)
        get_vector_store().add_chunks(chunks)
        document = add_document(
            db=db,
            filename=original_filename,
            original_filename=original_filename,
            content_type=file.content_type or "",
            chunk_count=len(chunks),
        )
    except DocumentLoadError as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except EmbeddingError as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except VectorStoreError as exc:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "filename": document.filename,
        "original_filename": document.original_filename,
        "chunks": document.chunk_count,
        "content_type": document.content_type,
        "created_at": document.created_at.isoformat(),
    }


@app.post("/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile | None = File(default=None),
    files: list[UploadFile] | None = File(default=None),
    db: Session = Depends(get_db),
) -> dict:
    uploads = list(files or [])
    if file is not None:
        uploads.append(file)
    if not uploads:
        raise HTTPException(status_code=400, detail="Upload at least one document.")

    indexed = [_index_upload(upload, db) for upload in uploads]
    return {
        "message": "Document indexed successfully." if len(indexed) == 1 else "Documents indexed successfully.",
        "filename": indexed[0]["filename"] if len(indexed) == 1 else None,
        "chunks": indexed[0]["chunks"] if len(indexed) == 1 else sum(item["chunks"] for item in indexed),
        "documents": indexed,
    }


@app.post("/ask")
def ask_question(payload: AskRequest, db: Session = Depends(get_db)) -> dict:
    filters = payload.document_filters or payload.selected_documents
    try:
        return answer_question(db, payload.question, document_filters=filters, session_id=payload.session_id)
    except NoDocumentsIndexedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except NoRelevantContextError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RAGError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except EmbeddingError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except VectorStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LLMError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _history_row(row) -> dict:
    source_details = []
    if getattr(row, "sources_json", None):
        try:
            source_details = json.loads(row.sources_json)
        except json.JSONDecodeError:
            source_details = []
    if not source_details:
        source_details = [source for source in row.sources.split(",") if source]
    return {
        "id": row.id,
        "session_id": row.session_id,
        "question": row.question,
        "answer": row.answer,
        "sources": source_details,
        "created_at": row.created_at.isoformat(),
    }


@app.get("/history")
def get_history(db: Session = Depends(get_db)) -> dict:
    sessions = list_sessions(db)
    if sessions:
        return {
            "items": [
                {
                    "id": session.id,
                    "session_id": session.id,
                    "title": session.title,
                    "question": session.title,
                    "created_at": session.created_at.isoformat(),
                    "updated_at": session.updated_at.isoformat(),
                    "messages": [_history_row(row) for row in get_session_messages(db, session.id)],
                }
                for session in sessions
            ]
        }
    return {"items": [_history_row(row) for row in list_history(db)]}


@app.post("/sessions", status_code=status.HTTP_201_CREATED)
def new_session(db: Session = Depends(get_db)) -> dict:
    session = create_session(db)
    return {
        "id": session.id,
        "session_id": session.id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
    }


@app.get("/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)) -> dict:
    messages = get_session_messages(db, session_id)
    if not messages:
        return {"id": session_id, "messages": []}
    return {"id": session_id, "messages": [_history_row(row) for row in messages]}


@app.delete("/history")
def delete_history(db: Session = Depends(get_db)) -> dict:
    deleted = clear_history(db)
    return {"message": "Chat history cleared.", "deleted": deleted}


@app.get("/documents")
def get_documents(db: Session = Depends(get_db)) -> dict:
    documents = list_documents(db)
    return {
        "items": [
            {
                "filename": document.filename,
                "original_filename": document.original_filename,
                "content_type": document.content_type,
                "chunks": document.chunk_count,
                "status": "Indexed",
                "created_at": document.created_at.isoformat(),
            }
            for document in documents
        ]
    }


@app.delete("/documents")
def delete_all_documents(db: Session = Depends(get_db)) -> dict:
    try:
        get_vector_store().delete_all()
    except VectorStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    filenames = clear_documents(db)
    for filename in filenames:
        (settings.upload_dir / filename).unlink(missing_ok=True)
    return {"message": "All documents deleted.", "deleted": len(filenames)}


@app.delete("/document/{filename}")
def delete_document(filename: str, db: Session = Depends(get_db)) -> dict:
    safe_filename = Path(filename).name
    document = get_document(db, safe_filename)
    if document is None:
        raise HTTPException(status_code=404, detail=f"Document '{safe_filename}' was not found.")

    try:
        get_vector_store().delete_document(safe_filename)
    except VectorStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    delete_document_record(db, safe_filename)
    (settings.upload_dir / safe_filename).unlink(missing_ok=True)
    return {"message": "Document deleted.", "filename": safe_filename}


@app.get("/health")
def health() -> dict:
    chroma_status = "ok"
    indexed_chunks = 0
    try:
        indexed_chunks = get_vector_store().count()
    except VectorStoreError as exc:
        chroma_status = str(exc)

    ollama_status = "ok"
    try:
        with urlopen(f"{settings.ollama_base_url}/api/tags", timeout=1):
            pass
    except (OSError, URLError):
        ollama_status = "unavailable"

    status_value = "ok" if chroma_status == "ok" and ollama_status == "ok" else "degraded"
    return {
        "status": status_value,
        "app": settings.app_name,
        "ollama_base_url": settings.ollama_base_url,
        "ollama": ollama_status,
        "llm_model": settings.llm_model,
        "embedding_model": settings.embedding_model,
        "chroma": chroma_status,
        "indexed_chunks": indexed_chunks,
    }
