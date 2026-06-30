# Local RAG with Llama 3

AI-powered local document question answering with FastAPI, ChromaDB, SQLite, and Ollama.

## Prerequisites

- Python 3.10+
- Node.js 18+
- Ollama installed and running

## Environment Configuration

Backend configuration is loaded from the root `.env` file by `backend/config.py` using `python-dotenv`. All other backend modules import settings from `config.py`; they should not hardcode model names, paths, database locations, or Ollama URLs.

Create your local environment file from the example:

```bash
copy .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Available variables:

```bash
APP_NAME=Local RAG with Llama 3
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=llama3
EMBEDDING_MODEL=nomic-embed-text
UPLOAD_DIR=uploads
CHROMA_DB_DIR=chroma_db
DATABASE_PATH=rag_history.sqlite3
CHROMA_COLLECTION=local_documents
CHUNK_SIZE=900
CHUNK_OVERLAP=150
RETRIEVAL_K=5
MAX_RELEVANCE_DISTANCE=1.35
MAX_UPLOAD_SIZE_MB=50
PDF_EXTENSION=.pdf
DOCX_EXTENSION=.docx
TXT_EXTENSION=.txt
ALLOWED_EXTENSIONS=.pdf,.docx,.txt
```

`DATABASE_URL` can also be set for a full SQLAlchemy database URL. If omitted, the app uses `DATABASE_PATH` and builds a SQLite URL automatically.

All path values may be absolute or relative. Relative paths are resolved from the project root.

## Ollama Setup

Install Ollama from https://ollama.com/download, then start Ollama and pull the required models:

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

Confirm Ollama is available:

```bash
ollama list
```

## Backend Setup

From the project root:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Run the FastAPI backend:

```bash
uvicorn main:app --reload
```

Backend API docs will be available at:

```text
http://127.0.0.1:8000/docs
```

## Frontend Setup

From the project root:

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `POST /upload` uploads and indexes PDF, DOCX, or TXT files.
- `POST /ask` asks a question using the indexed documents.
- `GET /history` returns chat history.
- `DELETE /history` clears chat history.
- `GET /documents` lists indexed documents.
- `DELETE /documents` deletes all indexed documents.
- `DELETE /document/{filename}` deletes one document and its vectors.
- `GET /health` returns backend and vector-store health.
