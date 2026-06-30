import { CheckCircle2, FileText, History, Layers3, MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import { fileKind, formatDate } from "../utils/format.js";

function EmptyState({ children }) {
  return <p className="rounded-lg border border-white/10 px-3 py-2 text-sm leading-5 text-slate-400">{children}</p>;
}

export default function Sidebar({
  documents,
  history,
  selectedHistoryId,
  selectedDocuments,
  onToggleDocument,
  onDeleteDocument,
  onNewChat,
  onUpload,
  onOpenHistory,
  isBusy,
}) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-slate-950 text-white md:w-80">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-950">
            <Layers3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Local RAG with Llama 3</p>
            <p className="text-xs text-slate-400">Document Assistant</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 border-b border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={onNewChat}
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </button>
        {!!documents.length && (
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10">
            <Plus className="h-4 w-4" />
            Upload More Documents
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              multiple
              className="sr-only"
              disabled={isBusy}
              onChange={(event) => onUpload(event.target.files)}
            />
          </label>
        )}
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Uploaded Documents
            </h3>
          </div>
          <div className="space-y-2">
            {!documents.length && <EmptyState>No documents indexed yet.</EmptyState>}
            {documents.map((document) => {
              const checked = selectedDocuments.includes(document.filename);
              return (
                <div
                  key={document.filename}
                  className="h-[70px] rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-slate-100 shadow-sm"
                >
                  <div className="flex h-full items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleDocument(document.filename)}
                      className={`h-4 w-4 shrink-0 rounded border ${
                        checked ? "border-emerald-300 bg-emerald-400" : "border-slate-500 bg-transparent"
                      }`}
                      aria-label={`Toggle ${document.filename} for retrieval`}
                      title="Use this document for retrieval"
                    />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-5" title={document.filename}>
                        {document.filename}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                          {fileKind(document.filename)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Indexed
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(document.filename)}
                      disabled={isBusy}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete ${document.filename}`}
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Chat History
            </h3>
          </div>
          <div className="space-y-2">
            {!history.length && <EmptyState>No previous conversations.</EmptyState>}
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenHistory(item)}
                className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                  selectedHistoryId === item.id
                    ? "border-white/25 bg-white/15"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/10"
                }`}
              >
                <History className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 leading-5">{item.title || item.question}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {formatDate(item.updated_at || item.created_at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-white/10 px-3 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Supported Formats
        </p>
        <div className="grid grid-cols-3 gap-1.5 text-center text-[11px] font-semibold text-slate-300">
          {["PDF", "DOCX", "TXT"].map((format) => (
            <span key={format} className="rounded-lg border border-white/10 bg-white/[0.04] py-1.5">
              {format}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
