from functools import lru_cache
import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
ENV_PATH = ROOT_DIR / ".env"
BACKEND_ENV_PATH = BACKEND_DIR / ".env"
load_dotenv(ENV_PATH)
load_dotenv(BACKEND_ENV_PATH, override=False)


def _get_str(name: str, default: str) -> str:
    return os.getenv(name, default).strip() or default


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value in (None, ""):
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _get_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value in (None, ""):
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _get_path(name: str, default: str) -> Path:
    value = _get_str(name, default)
    path = Path(value)
    if not path.is_absolute():
        path = ROOT_DIR / path
    return path


def _normalize_extension(value: str) -> str:
    extension = value.strip().lower()
    return extension if extension.startswith(".") else f".{extension}"


def _get_extensions(name: str, default: str) -> set[str]:
    raw = _get_str(name, default)
    extensions = set()
    for item in raw.split(","):
        extension = item.strip().lower()
        if not extension:
            continue
        extensions.add(_normalize_extension(extension))
    return extensions or {".pdf", ".docx", ".txt"}


def _database_url() -> str:
    explicit_url = os.getenv("DATABASE_URL")
    if explicit_url:
        return explicit_url.strip()

    database_path = _get_path("DATABASE_PATH", "rag_history.sqlite3")
    return f"sqlite:///{database_path}"


class Settings:
    def __init__(self) -> None:
        self.app_name = _get_str("APP_NAME", "Local RAG with Llama 3")

        self.ollama_base_url = _get_str("OLLAMA_BASE_URL", "http://localhost:11434")
        self.llm_model = _get_str("LLM_MODEL", "llama3")
        self.embedding_model = _get_str("EMBEDDING_MODEL", "nomic-embed-text")

        self.pdf_extension = _normalize_extension(_get_str("PDF_EXTENSION", ".pdf"))
        self.docx_extension = _normalize_extension(_get_str("DOCX_EXTENSION", ".docx"))
        self.txt_extension = _normalize_extension(_get_str("TXT_EXTENSION", ".txt"))

        self.upload_dir = _get_path("UPLOAD_DIR", "uploads")
        self.chroma_dir = _get_path("CHROMA_DB_DIR", "chroma_db")
        self.sqlite_url = _database_url()
        self.database_path = _get_path("DATABASE_PATH", "rag_history.sqlite3")

        self.chroma_collection = _get_str("CHROMA_COLLECTION", "local_documents")
        self.chunk_size = _get_int("CHUNK_SIZE", 900)
        self.chunk_overlap = _get_int("CHUNK_OVERLAP", 150)
        self.retrieval_k = _get_int("RETRIEVAL_K", 5)
        self.max_relevance_distance = _get_float("MAX_RELEVANCE_DISTANCE", 1.35)
        self.max_upload_size_mb = _get_int("MAX_UPLOAD_SIZE_MB", 50)
        self.allowed_extensions = _get_extensions(
            "ALLOWED_EXTENSIONS",
            f"{self.pdf_extension},{self.docx_extension},{self.txt_extension}",
        )

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    return settings


settings = get_settings()
