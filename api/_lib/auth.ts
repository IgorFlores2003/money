/**
 * Confere o token do Supabase Auth chamando /auth/v1/user (funciona com as
 * chaves antigas e as novas do projeto). Guarda o resultado por 1 minuto.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

const cache = new Map<string, { user: AuthUser; until: number }>();

export async function userFromToken(token: string): Promise<AuthUser | null> {
  if (!token) return null;
  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.user;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL/SUPABASE_ANON_KEY ausentes");
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    id: string;
    email?: string;
    email_confirmed_at?: string | null;
    user_metadata?: { display_name?: string };
  };
  if (!data.id || !data.email_confirmed_at) return null;
  const user = {
    id: data.id,
    email: data.email ?? "",
    name: data.user_metadata?.display_name ?? "",
  };
  if (cache.size > 500) cache.clear();
  cache.set(token, { user, until: Date.now() + 60_000 });
  return user;
}

/** Tira do cache os tokens de um usuário (ex.: depois de excluir a conta). */
export function forgetUser(id: string) {
  for (const [token, hit] of cache) if (hit.user.id === id) cache.delete(token);
}
