import { CheckCircle2, FileUp, Loader2, UploadCloud } from "lucide-react";

const uploadSteps = [
  "Uploading...",
  "Extracting text...",
  "Chunking...",
  "Generating embeddings...",
  "Indexing...",
  "Completed.",
];

export default function UploadPanel({ onUpload, isUploading, uploadStep }) {
  function handleDrop(event) {
    event.preventDefault();
    if (!isUploading && event.dataTransfer.files?.length) {
      onUpload(event.dataTransfer.files);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-soft">
        <FileUp className="h-8 w-8 text-slate-900" />
      </div>
      <h1 className="text-4xl font-semibold tracking-normal text-slate-950 md:text-5xl">
        Local RAG with Llama 3
      </h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
        Upload one or more documents to begin asking questions with Retrieval-Augmented Generation powered by Llama 3.
      </p>

      <label className="mt-8 inline-flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-base font-semibold text-white shadow-soft transition-colors hover:bg-slate-800 focus-within:ring-2 focus-within:ring-slate-400">
        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
        <span>{isUploading ? "Processing Documents" : "Upload Documents"}</span>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          multiple
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => onUpload(event.target.files)}
        />
      </label>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="mt-7 flex w-full flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-8 shadow-soft"
      >
        <UploadCloud className="h-8 w-8 text-slate-500" />
        <p className="mt-3 text-sm font-semibold text-slate-800">Drag and drop documents here</p>
        <p className="mt-1 text-sm text-slate-500">Supported: PDF, DOCX, TXT</p>
      </div>

      {isUploading && (
        <div className="mt-8 w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-soft">
          <div className="space-y-3">
            {uploadSteps.map((step, index) => {
              const isComplete = index < uploadStep;
              const isCurrent = index === uploadStep;
              return (
                <div key={step} className="flex items-center gap-3 text-sm">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isCurrent ? "border-slate-900" : "border-slate-300"
                      }`}
                    >
                      {isCurrent && <span className="h-2 w-2 rounded-full bg-slate-900" />}
                    </span>
                  )}
                  <span className={isComplete || isCurrent ? "text-slate-900" : "text-slate-400"}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
