// ─────────────────────────────────────────────────────────────
// Thin fetch wrapper around the Express API. Uses cookie-based
// auth (credentials: "include"), matching how the backend's
// sendTokenResponse sets an httpOnly "token" cookie on login.
// ─────────────────────────────────────────────────────────────

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
export const API_URL = rawApiUrl.replace(/\/+$/, "").replace(/\/api$/, "");

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function handle(res: Response) {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && (data as { message?: string }).message) ||
      res.statusText ||
      "Request failed";
    throw new ApiError(message, res.status, data);
  }
  return data;
}

export const api = {
  get: (path: string) => {
    const separator = path.includes("?") ? "&" : "?";
    const cacheBusterPath = `${path}${separator}_t=${Date.now()}`;
    return fetch(`${API_URL}${cacheBusterPath}`, { cache: "no-store", credentials: "include", headers: getHeaders() }).then(handle);
  },

  post: (path: string, body?: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handle),

  put: (path: string, body?: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: getHeaders({ "Content-Type": "application/json" }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handle),

  delete: (path: string) =>
    fetch(`${API_URL}${path}`, { method: "DELETE", credentials: "include", headers: getHeaders() }).then(handle),

  /** For multipart/form-data requests (file uploads). Don't set Content-Type manually. */
  postForm: (path: string, formData: FormData) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: getHeaders(),
      body: formData,
    }).then(handle),
};
