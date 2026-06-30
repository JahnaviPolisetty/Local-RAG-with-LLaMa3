from datetime import datetime
import json

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine, inspect, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from config import settings


class Base(DeclarativeBase):
    pass


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    messages: Mapped[list["ChatHistory"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int | None] = mapped_column(ForeignKey("chat_sessions.id"), nullable=True, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[str] = mapped_column(Text, default="")
    sources_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped[ChatSession | None] = relationship(back_populates="messages")


class IndexedDocument(Base):
    __tablename__ = "indexed_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), default="")
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


engine = create_engine(settings.sqlite_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_chat_history()


def _migrate_chat_history() -> None:
    inspector = inspect(engine)
    if "chat_history" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("chat_history")}
    with engine.begin() as connection:
        if "session_id" not in existing:
            connection.execute(text("ALTER TABLE chat_history ADD COLUMN session_id INTEGER"))
        if "sources_json" not in existing:
            connection.execute(text("ALTER TABLE chat_history ADD COLUMN sources_json TEXT DEFAULT '[]'"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _session_title(question: str) -> str:
    title = " ".join(question.split())[:80]
    return title or "New Conversation"


def create_session(db: Session, title: str = "New Conversation") -> ChatSession:
    session = ChatSession(title=title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: int | None) -> ChatSession | None:
    if session_id is None:
        return None
    return db.get(ChatSession, session_id)


def add_history(
    db: Session,
    question: str,
    answer: str,
    sources: list[str],
    source_details: list[dict] | None = None,
    session_id: int | None = None,
) -> ChatHistory:
    session = get_session(db, session_id)
    if session is None:
        session = ChatSession(title=_session_title(question))
        db.add(session)
        db.flush()
    elif session.title == "New Conversation":
        session.title = _session_title(question)

    session.updated_at = datetime.utcnow()
    row = ChatHistory(
        session_id=session.id,
        question=question,
        answer=answer,
        sources=",".join(sorted(set(sources))),
        sources_json=json.dumps(source_details or []),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_history(db: Session) -> list[ChatHistory]:
    return list(db.scalars(select(ChatHistory).order_by(ChatHistory.created_at.desc())))


def list_sessions(db: Session) -> list[ChatSession]:
    return list(db.scalars(select(ChatSession).order_by(ChatSession.updated_at.desc())))


def get_session_messages(db: Session, session_id: int) -> list[ChatHistory]:
    return list(
        db.scalars(
            select(ChatHistory)
            .where(ChatHistory.session_id == session_id)
            .order_by(ChatHistory.created_at.asc())
        )
    )


def clear_history(db: Session) -> int:
    rows = list(db.scalars(select(ChatHistory)))
    sessions = list(db.scalars(select(ChatSession)))
    count = len(rows)
    for row in rows:
        db.delete(row)
    for session in sessions:
        db.delete(session)
    db.commit()
    return count


def get_document(db: Session, filename: str) -> IndexedDocument | None:
    return db.scalar(select(IndexedDocument).where(IndexedDocument.filename == filename))


def add_document(
    db: Session,
    filename: str,
    original_filename: str,
    content_type: str,
    chunk_count: int,
) -> IndexedDocument:
    row = IndexedDocument(
        filename=filename,
        original_filename=original_filename,
        content_type=content_type or "",
        chunk_count=chunk_count,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_documents(db: Session) -> list[IndexedDocument]:
    return list(db.scalars(select(IndexedDocument).order_by(IndexedDocument.created_at.desc())))


def delete_document_record(db: Session, filename: str) -> bool:
    row = get_document(db, filename)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def clear_documents(db: Session) -> list[str]:
    rows = list_documents(db)
    filenames = [row.filename for row in rows]
    for row in rows:
        db.delete(row)
    db.commit()
    return filenames
