import { useState } from "react";
import { Bot, ChevronDown, FileText, Loader2, UserRound } from "lucide-react";
import { normalizeSources } from "../utils/format.js";

function SourceAccordion({ sources }) {
  const normalized = normalizeSources(sources);
  const [isOpen, setIsOpen] = useState(false);

  if (!normalized.length) return null;

  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-300"
        aria-expanded={isOpen}
      >
        <span>Sources ({normalized.length})</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="grid gap-2 border-t border-slate-200 p-2.5">
          {normalized.map((source, index) => (
            <div
              key={`${source.document}-${source.page ?? "unknown"}-${index}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              title={source.document}
            >
              <div className="flex items-start gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="truncate font-medium text-slate-900">{source.document}</p>
                    <span className="text-xs text-slate-500">Page {source.page ?? "Unknown"}</span>
                  </div>
                  {!!source.excerpts?.length && (
                    <blockquote className="mt-1.5 line-clamp-3 border-l-2 border-slate-200 pl-2.5 text-xs leading-5 text-slate-600">
                      "{source.excerpts[0]}"
                    </blockquote>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ message }) {
  const isUser = message.role === "user";
  const Icon = isUser ? UserRound : Bot;

  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[82%] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isUser ? "bg-slate-900 text-white" : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`rounded-2xl px-4 py-3 shadow-sm ${
              isUser
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-900"
            }`}
          >
            <p className={`mb-1.5 text-xs font-semibold uppercase tracking-wide ${isUser ? "text-slate-300" : "text-slate-500"}`}>
              {isUser ? "You" : "Assistant"}
            </p>
            <div className="whitespace-pre-wrap break-words text-[15px] leading-7">
              {message.content}
            </div>
          </div>
          {!isUser && <SourceAccordion sources={message.sources} />}
        </div>
      </div>
    </article>
  );
}

export default function MessageList({ messages, isThinking, hasDocuments }) {
  if (!messages.length && !isThinking) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
        <div className="max-w-xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Bot className="h-6 w-6 text-slate-900" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-950">
            {hasDocuments ? "Your documents are ready." : "Upload one or more documents to begin asking questions."}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {hasDocuments
              ? "Start asking questions below. If no documents are selected, retrieval searches all indexed documents."
              : "Supported: PDF, DOCX, TXT"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 basis-3/4 overflow-y-auto px-4 py-4 md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {isThinking && (
          <article className="flex justify-start">
            <div className="flex max-w-[82%] gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-900 shadow-sm ring-1 ring-slate-200">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating answer
                </div>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
