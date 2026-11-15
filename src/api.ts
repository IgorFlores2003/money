import { supabase } from "./supabase";

/** Na web, /api do mesmo domínio; no app Android, a URL publicada (VITE_API_URL). */
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api/";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: options.method || "GET",
      headers: {
        ...(options.body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor. Confira sua internet.", 0);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error || "Não foi possível concluir.", res.status);
  return json as T;
}

export const post = <T>(path: string, body: unknown = {}) => api<T>(path, { method: "POST", body });
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: "PUT", body });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
