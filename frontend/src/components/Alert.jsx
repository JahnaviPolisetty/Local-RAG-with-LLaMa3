import { X } from "lucide-react";

export default function Alert({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 md:px-6">
      <p className="leading-6">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md p-1 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
        aria-label="Dismiss error"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
