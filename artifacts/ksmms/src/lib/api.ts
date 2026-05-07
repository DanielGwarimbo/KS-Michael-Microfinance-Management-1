const API_BASE = "/api";

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({ error: "Invalid response" }));
    if (!res.ok)
      return { data: json as T, error: json.error || `Error ${res.status}` };
    return { data: json as T, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { data: null, error: msg };
  }
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
