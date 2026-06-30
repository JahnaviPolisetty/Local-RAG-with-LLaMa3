export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function fileKind(filename = "") {
  const extension = filename.split(".").pop()?.toUpperCase();
  return extension || "DOC";
}

function cleanDocumentName(value = "Unknown document") {
  return String(value).split(/[\\/]/).pop() || "Unknown document";
}

export function normalizeSources(sources = []) {
  const grouped = new Map();

  sources.forEach((source) => {
    const raw = typeof source === "string" ? { filename: source } : source || {};
    const document = cleanDocumentName(raw.filename || raw.document || raw.document_name);
    const page = raw.page ?? raw.page_number ?? null;
    const text = raw.relevant_chunk || raw.text || "";
    const key = `${document}::${page ?? "unknown"}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        document,
        filename: document,
        page,
        excerpts: [],
      });
    }

    if (text) {
      const current = grouped.get(key);
      const excerpt = text.length > 420 ? `${text.slice(0, 420).trim()}...` : text;
      if (!current.excerpts.includes(excerpt)) {
        current.excerpts.push(excerpt);
      }
    }
  });

  return Array.from(grouped.values());
}
