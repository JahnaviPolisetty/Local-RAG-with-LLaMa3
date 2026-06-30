import { Menu, X } from "lucide-react";

export default function TopBar({ onToggleSidebar, isSidebarOpen }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 md:hidden"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-950">
            Local RAG with Llama 3
          </h1>
          <p className="text-xs text-slate-500">NotebookLM-style document intelligence</p>
        </div>
      </div>
    </header>
  );
}
