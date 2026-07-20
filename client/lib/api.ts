// ─────────────────────────────────────────────────────────────
// Thin fetch wrapper around the Express API. Uses cookie-based
// auth (credentials: "include"), matching how the backend's
// sendTokenResponse sets an httpOnly "token" cookie on login.
// ─────────────────────────────────────────────────────────────

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
  get: (path: string) => fetch(`${API_URL}${path}`, { credentials: "include" }).then(handle),

  post: (path: string, body?: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handle),

  put: (path: string, body?: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).then(handle),

  delete: (path: string) =>
    fetch(`${API_URL}${path}`, { method: "DELETE", credentials: "include" }).then(handle),

  /** For multipart/form-data requests (file uploads). Don't set Content-Type manually. */
  postForm: (path: string, formData: FormData) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(handle),
};
