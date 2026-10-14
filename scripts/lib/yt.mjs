// YouTube Data API v3 with Win's key. The key comes from the GitHub secret YT_API_KEY, or on Win's PC from
// Desktop\MrNews\youtube_key.txt (one folder ABOVE this project, so it can never be committed). It is never printed.
import fs from "node:fs";
import path from "node:path";
import { ROOT, UA } from "./util.mjs";

const API = "https://www.googleapis.com/youtube/v3/";

function readKey() {
  if (process.env.YT_API_KEY) return process.env.YT_API_KEY.trim();
  const file = path.join(ROOT, "..", "youtube_key.txt");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  return null;
}
const KEY = readKey();
export const hasKey = () => !!KEY;

// counts what one run uses: search.list has its own bucket of 100 calls a day, everything else 10,000 units
export const used = { search: 0, units: 0 };

export async function yt(method, params) {
  if (!KEY) throw new Error("no YouTube key (set YT_API_KEY)");
  const q = new URLSearchParams({ ...params, key: KEY });
  if (method === "search") used.search++;
  else used.units++;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(API + method + "?" + q, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      const j = await res.json();
      if (j.error) {
        const err = new Error(`${method}: HTTP ${res.status} ${j.error.message}`.split(KEY).join("<key>"));
        err.status = res.status;
        if (res.status === 403 || res.status === 400) throw Object.assign(err, { fatal: true }); // quota / bad request: no retry
        throw err;
      }
      return j;
    } catch (e) {
      lastErr = e;
      if (e.fatal) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error(String(lastErr && lastErr.message).split(KEY).join("<key>"));
}

// videos.list / channels.list for many ids, 50 per call (1 unit each)
export async function listByIds(method, part, ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await yt(method, { part, id: ids.slice(i, i + 50).join(","), maxResults: 50 });
    out.push(...(j.items || []));
  }
  return out;
}
