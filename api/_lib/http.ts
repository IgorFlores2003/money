import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "./router.js";

/** Origens liberadas no CORS: o próprio site e o app Android (Capacitor). */
function allowed(origin: string | undefined, host: string | undefined) {
  if (!origin) return false;
  const list = (process.env.ALLOWED_ORIGINS || "https://localhost,capacitor://localhost")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.includes(origin)) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readBody(req: IncomingMessage & { body?: unknown }, limit: number) {
  if (req.body !== undefined) return req.body; // a Vercel já leu o JSON
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > limit) throw new Error("Corpo muito grande");
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

/** Adaptador Node (Vercel e servidor do Vite em desenvolvimento). */
export async function nodeHandler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  path: string,
) {
  const origin = req.headers.origin;
  if (allowed(origin, req.headers.host)) {
    res.setHeader("Access-Control-Allow-Origin", origin!);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  const url = new URL(req.url || "/", "http://local");
  const query = Object.fromEntries(url.searchParams);
  delete query.path;
  let body: unknown = {};
  try {
    if (req.method !== "GET" && req.method !== "DELETE") body = await readBody(req, path === "import/photo" ? 5_000_000 : 100_000);
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Dados inválidos." }));
  }
  const auth = req.headers.authorization || "";
  const result = await handle({
    method: req.method || "GET",
    path,
    query,
    body,
    token: auth.startsWith("Bearer ") ? auth.slice(7) : "",
  });
  res.statusCode = result.status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(result.body));
}
