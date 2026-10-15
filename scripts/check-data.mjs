// Sanity check of the files the pages read. Fails the robot's run (red in GitHub, and GitHub e-mails Win) when
// something is broken, so a wrong or stale file is noticed - the commit step still saves what was fetched.
// It checks the NUMBERS, not only that files exist: a page can look perfect while showing old or doubled data.
import fs from "node:fs";
import path from "node:path";
import { DATA, readJson, log, isMain } from "./lib/util.mjs";

export const YT_STALE_H = 36; // YouTube is read about once a day; 36 h = one missed read plus GitHub's delays

export function checkData(now = Date.now()) {
  const problems = [];
  const need = (cond, what) => { if (!cond) problems.push(what); };
  const L = readJson("latest.json", null);
  need(L, "latest.json missing");
  if (L) {
    need(now - Date.parse(L.updated) < 3 * 864e5, "latest.json older than 3 days");
    need(L.creator?.top?.length >= 20, `creator top too short (${L.creator?.top?.length})`);
    need(L.creator?.top?.every((v) => v.id && v.t && v.g >= 0), "a top video lacks id / title / gain");
    need(L.creator?.themes?.every((t) => t.share >= 0 && t.share <= 1), "theme share outside 0..1");
    need(Array.isArray(L.trends?.today), "trends missing");
  }

  // YouTube must really have been read recently, and its last error must not be newer than its last success
  const runs = readJson("state/runs.json", {});
  const yt = runs.youtube || {};
  const ytAgeH = yt.at ? (now - Date.parse(yt.at)) / 3600e3 : Infinity;
  need(ytAgeH < YT_STALE_H, `YouTube not read for ${isFinite(ytAgeH) ? ytAgeH.toFixed(0) + " h" : "ever"} (limit ${YT_STALE_H} h)${yt.lastError ? " - last error: " + yt.lastError : ""}`);
  need(!(yt.lastError && (!yt.at || yt.errorAt > yt.at)), `YouTube's last run failed: ${yt.lastError}`);
  for (const [name, r] of Object.entries(runs)) if (name !== "youtube" && r.lastError && (!r.at || r.errorAt > r.at)) log(`note: ${name} last failed: ${r.lastError}`);

  // the history: no day may be a copy of the day before (that doubled October's total once)
  const dir = path.join(DATA, "days");
  const days = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
  const recs = days.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
  const sig = (d) => JSON.stringify(d.creator.top.slice(0, 50).map((r) => [r[0], r[1]]));
  for (let i = 1; i < recs.length; i++) need(sig(recs[i]) !== sig(recs[i - 1]), `day ${recs[i].day} is a copy of ${recs[i - 1].day}`);
  for (const d of recs) need(d.updated && thaiDay(d.updated) === d.day, `day ${d.day} holds a YouTube read of another day (${d.updated})`);

  // a month = the sum of its own days, each day counted once
  for (const f of fs.existsSync(path.join(DATA, "months")) ? fs.readdirSync(path.join(DATA, "months")) : []) {
    const m = JSON.parse(fs.readFileSync(path.join(DATA, "months", f), "utf8"));
    const own = recs.filter((d) => d.day.startsWith(m.period));
    need(new Set(m.days).size === m.days.length, `month ${m.period} counts a day twice`);
    need(m.total === own.reduce((a, d) => a + d.creator.total, 0), `month ${m.period} total ${m.total} is not the sum of its ${own.length} days`);
  }

  const I = readJson("ideas.json", null);
  need(I?.cards?.length >= 1, "ideas.json has no cards");
  return problems;
}

const thaiDay = (iso) => new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 10);

if (isMain(import.meta.url)) {
  const problems = checkData();
  if (problems.length) {
    console.error("DATA PROBLEMS:\n- " + problems.join("\n- "));
    process.exit(1);
  }
  log("data files look right");
}
