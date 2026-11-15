import type { IncomingMessage, ServerResponse } from "node:http";
import { nodeHandler } from "./_lib/http.js";

/** Única função da API: o vercel.json manda /api/* para cá com ?path=. */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const path = new URL(req.url || "/", "http://local").searchParams.get("path") || "";
  return nodeHandler(req, res, path);
}
