import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "./components/Alert.jsx";
import ChatInput from "./components/ChatInput.jsx";
import MessageList from "./components/MessageList.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Toast from "./components/Toast.jsx";
import TopBar from "./components/TopBar.jsx";
import UploadPanel from "./components/UploadPanel.jsx";
import {
  askQuestion,
  createSession,
  deleteDocument,
  getApiError,
  getDocuments,
  getHealth,
  getHistory,
  uploadDocument,
} from "./services/api.js";

function sessionToMessages(item) {
  const messages = item.messages || [];
  if (!messages.length && item.question && item.answer) {
    return [
      { id: `history-${item.id}-user`, role: "user", content: item.question, sources: [] },
      { id: `history-${item.id}-assistant`, role: "assistant", content: item.answer, sources: item.sources || [] },
    ];
  }
  return messages.flatMap((message) => [
    {
      id: `session-${item.id}-${message.id}-user`,
      role: "user",
      content: message.question,
      sources: [],
    },
    {
      id: `session-${item.id}-${message.id}-assistant`,
      role: "assistant",
      content: message.answer,
      sources: message.sources || [],
    },
  ]);
}

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [toast, setToast] = useState("");
  const [uploadStep, setUploadStep] = useState(0);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);

  const isBusy = isUploading || isAsking;
  const hasDocuments = documents.length > 0;

  const loadDocuments = useCallback(async () => {
    const data = await getDocuments();
    setDocuments(data);
    setSelectedDocuments((current) => current.filter((name) => data.some((doc) => doc.filename === name)));
  }, []);

  const loadHistory = useCallback(async () => {
    const data = await getHistory();
    setHistory(data);
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      setHealth(await getHealth());
    } catch {
      setHealth({ status: "unavailable" });
    }
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      try {
        await Promise.all([loadDocuments(), loadHistory(), loadHealth()]);
      } catch (requestError) {
        setError(getApiError(requestError));
      }
    }

    loadInitialData();
  }, [loadDocuments, loadHealth, loadHistory]);

  useEffect(() => {
    const intervalId = window.setInterval(loadHealth, 30000);
    return () => window.clearInterval(intervalId);
  }, [loadHealth]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  async function handleUpload(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setIsUploading(true);
    setUploadStep(0);
    setError("");
    const progressId = window.setInterval(() => {
      setUploadStep((current) => Math.min(current + 1, 4));
    }, 900);

    try {
      await uploadDocument(files);
      setUploadStep(5);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      await loadDocuments();
      await loadHealth();
      setToast(files.length === 1 ? "Document indexed successfully." : "Documents indexed successfully.");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      window.clearInterval(progressId);
      setIsUploading(false);
    }
  }

  async function ensureSession() {
    if (activeSessionId) return activeSessionId;
    const session = await createSession();
    setActiveSessionId(session.session_id || session.id);
    setSelectedHistoryId(session.session_id || session.id);
    return session.session_id || session.id;
  }

  async function handleAsk() {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isAsking) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanQuestion,
      sources: [],
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setIsAsking(true);
    setError("");

    try {
      const sessionId = await ensureSession();
      const response = await askQuestion(cleanQuestion, {
        sessionId,
        documentFilters: selectedDocuments,
      });
      setActiveSessionId(response.session_id || sessionId);
      setSelectedHistoryId(response.session_id || sessionId);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${response.id || Date.now()}`,
          role: "assistant",
          content: response.answer,
          sources: response.sources || [],
        },
      ]);
      await loadHistory();
    } catch (requestError) {
      const message = getApiError(requestError);
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: message,
          sources: [],
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  async function handleDeleteDocument(filename) {
    setError("");
    try {
      await deleteDocument(filename);
      setSelectedDocuments((current) => current.filter((name) => name !== filename));
      await loadDocuments();
      await loadHealth();
      setToast("Document deleted.");
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }

  function handleToggleDocument(filename) {
    setSelectedDocuments((current) =>
      current.includes(filename)
        ? current.filter((name) => name !== filename)
        : [...current, filename],
    );
  }

  async function handleNewChat() {
    setError("");
    setMessages([]);
    setQuestion("");
    setSelectedHistoryId(null);
    try {
      const session = await createSession();
      setActiveSessionId(session.session_id || session.id);
      await loadHistory();
    } catch (requestError) {
      setActiveSessionId(null);
      setError(getApiError(requestError));
    }
  }

  function handleOpenHistory(item) {
    setSelectedHistoryId(item.session_id || item.id);
    setActiveSessionId(item.session_id || item.id);
    setMessages(sessionToMessages(item));
    setIsSidebarOpen(false);
  }

  const sidebar = useMemo(
    () => (
      <Sidebar
        documents={documents}
        history={history}
        selectedHistoryId={selectedHistoryId}
        selectedDocuments={selectedDocuments}
        onToggleDocument={handleToggleDocument}
        onDeleteDocument={handleDeleteDocument}
        onNewChat={handleNewChat}
        onUpload={handleUpload}
        onOpenHistory={handleOpenHistory}
        isBusy={isBusy}
      />
    ),
    [documents, history, isBusy, selectedDocuments, selectedHistoryId],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-950">
      <Toast message={toast} onDismiss={() => setToast("")} />
      <div className="hidden md:block">{sidebar}</div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar overlay"
          />
          <div className="relative h-full w-80 max-w-[86vw]">{sidebar}</div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
          isSidebarOpen={isSidebarOpen}
        />
        <Alert message={error} onDismiss={() => setError("")} />
        {!hasDocuments ? (
          <section className="flex flex-1 items-center justify-center bg-slate-50">
            <UploadPanel
              onUpload={handleUpload}
              isUploading={isUploading}
              uploadStep={uploadStep}
            />
          </section>
        ) : (
          <>
            <MessageList
              messages={messages}
              isThinking={isAsking}
              hasDocuments={hasDocuments}
            />
            <ChatInput
              value={question}
              onChange={setQuestion}
              onSubmit={handleAsk}
              disabled={isBusy}
            />
          </>
        )}
      </main>
    </div>
  );
}
