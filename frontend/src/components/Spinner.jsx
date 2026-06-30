export default function Spinner({ label = "Loading", className = "text-slate-500" }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}
    </span>
  );
}
