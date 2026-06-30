import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-soft">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
