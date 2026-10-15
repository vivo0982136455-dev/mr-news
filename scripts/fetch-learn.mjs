// Once a week: pick real Thai tutorial videos for every lesson (config/learn.json), and the most viewed
// AI-made videos of the last 90 days. Only videos whose owner allows embedding are kept. ~18 searches a week.
// A lesson video must FIT its lesson (see lessonFits); the search's relevance order is kept. Sorting by views
// (the first version) put popular off-topic clips in lessons - a Chinese drama recap under "write a script".
import fs from "node:fs";
import path from "node:path";
import { ROOT, writeJson, readJson, isoSeconds, log, isMain } from "./lib/util.mjs";
import { yt, listByIds, hasKey } from "./lib/yt.mjs";
import { THAI } from "../js/shared/themes.js";

const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "learn.json"), "utf8"));
const KEEP = 4;
export const MIN_SEC = 45;      // shorter is a teaser, not a lesson
export const MAX_SEC = 30 * 60; // longer is a live stream, a course or a drama recap
const TEACH = /สอน|วิธี|how ?to|ฮาวทู|tutorial|เทคนิค|มือใหม่|ขั้นตอน|ทีละขั้น|ยังไง|อย่างไร|พื้นฐาน|จับมือทำ|เริ่มต้น|ใช้งาน|ง่ายๆ|แจกสูตร|ทำตาม|ตั้งค่า/i;

// a Latin word must stand alone ("ai" is not inside "mail"); a Thai word may sit anywhere (Thai has no spaces)
const has = (title, word) => (/^[\x20-\x7e]+$/.test(word)
  ? new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(title)
  : title.toLowerCase().includes(word.toLowerCase()));

// the rule a lesson video must pass: Thai title, a teaching word, one word of every "must" group, none of "not",
// 45 s - 30 min
export function lessonFits(title, sec, must = [], not = []) {
  return THAI.test(title) && TEACH.test(title) && sec >= MIN_SEC && sec <= MAX_SEC
    && must.every((group) => group.some((w) => has(title, w))) && !not.some((w) => has(title, w));
}

const pick = (v) => ({
  id: v.id,
  t: v.snippet.title,
  cn: v.snippet.channelTitle,
  d: isoSeconds(v.contentDetails?.duration),
  p: v.snippet.publishedAt,
  v: +(v.statistics?.viewCount || 0),
});

async function details(ids) {
  if (!ids.length) return [];
  return (await listByIds("videos", "snippet,statistics,contentDetails,status", ids)).filter((v) => v.status?.embeddable !== false);
}

export async function fetchLearn() {
  if (!hasKey()) { log("learn: no key - skipped"); return { skipped: true }; }
  const out = readJson("learn.json", { lessons: {}, best_ai: [] });
  out.lessons = out.lessons || {};
  const counts = {};
  const only = (process.env.ONLY || "").split(",").filter(Boolean); // ONLY=h-sound re-checks one lesson (1 search)
  for (const [lesson, L] of Object.entries(cfg.lessons)) {
    if (only.length && !only.includes(lesson)) continue;
    try {
      const j = await yt("search", { part: "id", type: "video", q: L.q, maxResults: 25, regionCode: "TH", relevanceLanguage: "th", order: "relevance" });
      const found = j.items.map((x) => x.id.videoId);
      // hand-picked first, then this week's search in its relevance order, then last week's picks as a reserve
      const ids = [...new Set([...(L.pinned || []), ...found, ...(out.lessons[lesson]?.vids || []).map((v) => v.id)])];
      const byId = new Map((await details(ids)).map((v) => [v.id, v]));
      const pinned = new Set(L.pinned || []);
      const vids = ids.map((id) => byId.get(id)).filter(Boolean)
        .filter((v) => pinned.has(v.id) || lessonFits(v.snippet.title, isoSeconds(v.contentDetails?.duration), L.must, L.not))
        .slice(0, KEEP).map(pick);
      out.lessons[lesson] = { q: L.q, vids, checked: new Date().toISOString() };
      counts[lesson] = vids.length;
      log(`learn ${lesson}: ${vids.length} videos fit (of ${found.length} found)`);
    } catch (e) {
      log(`learn ${lesson} failed: ${e.message}`);
      if (e.fatal) break;
    }
  }
  const best = new Map();
  for (const q of only.length ? [] : cfg.best_ai) {
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
  return { updated: out.updated, counts };
}

if (isMain(import.meta.url)) fetchLearn().catch((e) => { console.error(e.message); process.exit(1); });
