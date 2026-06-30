import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  timeout: 120000,
});

export function getApiError(error) {
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return "Something went wrong while contacting the backend.";
}

export async function uploadDocument(files) {
  const selectedFiles = Array.isArray(files) ? files : [files];
  const formData = new FormData();
  selectedFiles.forEach((file) => formData.append("files", file));
  const response = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function askQuestion(question, options = {}) {
  const response = await api.post("/ask", {
    question,
    session_id: options.sessionId || null,
    document_filters: options.documentFilters || [],
  });
  return response.data;
}

export async function getDocuments() {
  const response = await api.get("/documents");
  return response.data.items || [];
}

export async function deleteDocument(filename) {
  const response = await api.delete(`/document/${encodeURIComponent(filename)}`);
  return response.data;
}

export async function getHistory() {
  const response = await api.get("/history");
  return response.data.items || [];
}

export async function createSession() {
  const response = await api.post("/sessions");
  return response.data;
}

export async function getSession(sessionId) {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data;
}

export async function deleteHistory() {
  const response = await api.delete("/history");
  return response.data;
}

export async function getHealth() {
  const response = await api.get("/health");
  return response.data;
}
