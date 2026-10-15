// The one command GitHub runs every 6 hours (and Win can run by hand):
//   Google Trends every time · YouTube once a day (when the last full read is 20+ h old) ·
//   Wikipedia "most followed" and the lesson videos once a week · then build the pages' data.
// FORCE=youtube,learn,famous runs those now. A failing source never stops the others; its old data stays.
// A missing key is a FAILURE (recorded in runs.json), not a quiet skip: scripts/check-data.mjs then turns the run red.
import { readJson, writeJson, log } from "./lib/util.mjs";
import { fetchTrends } from "./fetch-trends.mjs";
import { fetchYoutube } from "./fetch-youtube.mjs";
import { fetchFamous } from "./fetch-famous.mjs";
import { fetchLearn } from "./fetch-learn.mjs";
import { build } from "./build.mjs";

const force = new Set((process.env.FORCE || "").split(",").map((s) => s.trim()).filter(Boolean));
const runs = readJson("state/runs.json", {});
const ageH = (k) => (runs[k] ? (Date.now() - Date.parse(runs[k].at)) / 3600e3 : Infinity);
const status = {};

async function step(name, fn, everyHours) {
  if (!force.has(name) && ageH(name) < everyHours) return log(`${name}: done ${ageH(name).toFixed(1)} h ago - not yet`);
  try {
    const r = await fn();
    if (r && r.skipped) throw new Error("no YouTube key (YT_API_KEY) - nothing was read"); // not "done": try again next run
    runs[name] = { at: new Date().toISOString(), ok: true, info: r && typeof r === "object" ? Object.fromEntries(Object.entries(r).filter(([k]) => !["youtube", "tiktok", "facebook", "lessons", "best_ai", "pages"].includes(k))) : r };
    status[name] = "ok";
  } catch (e) {
    log(`${name} FAILED: ${e.message}`);
    runs[name] = { ...(runs[name] || {}), lastError: e.message, errorAt: new Date().toISOString() };
    status[name] = "failed";
  }
}

await step("trends", fetchTrends, 0);
await step("youtube", fetchYoutube, 20);
await step("famous", fetchFamous, 24 * 6.5);
await step("learn", fetchLearn, 24 * 6.5);
writeJson("state/runs.json", runs, true);
build();
log("all done:", JSON.stringify(status));
if (Object.values(status).every((s) => s === "failed")) process.exit(1);
