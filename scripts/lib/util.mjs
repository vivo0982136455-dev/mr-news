// Small helpers shared by every robot script: web requests with a time limit, JSON files written only when changed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATA = path.join(ROOT, "data");
export const UA = "MrNewsBot/1.0 (personal creator dashboard; github.com/vivo0982136455-dev)";

// GET a URL with a time limit. An error page's body is cancelled before throwing:
// an unread body keeps the socket (and the whole process) open on Node 20 (lesson from the Lao project).
export async function fetchText(url, { timeout = 30000, headers = {} } = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body = body.slice(0, 500);
    throw err;
  }
  return res.text();
}

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));
  } catch {
    return fallback;
  }
}

// write data/<file> only when the content changed (keeps the robot's git commits small)
export function writeJson(file, value, pretty = false) {
  const full = path.join(DATA, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const text = JSON.stringify(value, null, pretty ? 1 : 0) + "\n";
  const old = fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
  if (old === text) return false;
  fs.writeFileSync(full, text);
  return true;
}

// Thai time (UTC+7) helpers: the dashboard's "day" is a Thai calendar day
export const thaiDate = (d = new Date()) => new Date(d.getTime() + 7 * 3600e3).toISOString().slice(0, 10);
export const hoursBetween = (a, b) => Math.abs(new Date(b) - new Date(a)) / 3600e3;

// "PT1M42S" -> 102 seconds
export function isoSeconds(iso) {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

export const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// true when this file was started directly ("node scripts/x.mjs"), false when imported by fetch-all.mjs
export const isMain = (metaUrl) => !!process.argv[1] && metaUrl === pathToFileURL(process.argv[1]).href;
