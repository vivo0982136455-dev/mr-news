// Once a week: pick real tutorial videos from YouTube for every lesson (config/learn.json), and the most viewed
// AI-made videos of the last 90 days. Only videos whose owner allows embedding are kept. ~18 searches a week.
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson, readJson, isoSeconds, log, isMain } from "./lib/util.mjs";
import { yt, listByIds, hasKey } from "./lib/yt.mjs";
import { THAI } from "../js/shared/themes.js";

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "learn.json"), "utf8"));

const pick = (v) => ({
  id: v.id,
  t: v.snippet.title,
  cn: v.snippet.channelTitle,
  d: isoSeconds(v.contentDetails?.duration),
  p: v.snippet.publishedAt,
  v: +(v.statistics?.viewCount || 0),
});

async function details(ids) {
  return (await listByIds("videos", "snippet,statistics,contentDetails,status", ids)).filter((v) => v.status?.embeddable !== false);
}

export async function fetchLearn() {
  if (!hasKey()) { log("learn: no key - skipped"); return { skipped: true }; }
  const out = readJson("learn.json", { lessons: {}, best_ai: [] });
  out.lessons = out.lessons || {};
  for (const [lesson, q] of Object.entries(cfg.lessons)) {
    try {
      const j = await yt("search", { part: "id", type: "video", q, maxResults: 20, regionCode: "TH", relevanceLanguage: "th", order: "relevance" });
      const vids = (await details(j.items.map((x) => x.id.videoId)))
        .filter((v) => THAI.test(v.snippet.title) && isoSeconds(v.contentDetails?.duration) >= 45) // a real lesson, in Thai
        .map(pick)
        .sort((a, b) => b.v - a.v)
        .slice(0, 4);
      if (vids.length) out.lessons[lesson] = { q, vids };
      log(`learn ${lesson}: ${vids.length} videos`);
    } catch (e) {
      log(`learn ${lesson} failed: ${e.message}`);
      if (e.fatal) break;
    }
  }
  const best = new Map();
  for (const q of cfg.best_ai) {
    try {
      const j = await yt("search", { part: "id", type: "video", q, maxResults: 25, order: "viewCount", publishedAfter: new Date(Date.now() - 90 * 864e5).toISOString() });
      for (const v of await details(j.items.map((x) => x.id.videoId))) best.set(v.id, pick(v));
    } catch (e) {
      log(`best AI "${q}" failed: ${e.message}`);
    }
  }
  if (best.size) out.best_ai = [...best.values()].sort((a, b) => b.v - a.v).slice(0, 12);
  out.updated = new Date().toISOString();
  writeJson("learn.json", out);
  return out;
}

if (isMain(import.meta.url)) fetchLearn().catch((e) => { console.error(e.message); process.exit(1); });
