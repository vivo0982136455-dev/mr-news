// Sanity check of the files the pages read. Fails the robot's run (red in GitHub) when something is broken,
// so a wrong file is noticed - the commit step still saves what was fetched.
import { readJson, log } from "./lib/util.mjs";

const problems = [];
const need = (cond, what) => { if (!cond) problems.push(what); };
const L = readJson("latest.json", null);
need(L, "latest.json missing");
if (L) {
  need(Date.now() - Date.parse(L.updated) < 3 * 864e5, "latest.json older than 3 days");
  need(L.creator?.top?.length >= 20, `creator top too short (${L.creator?.top?.length})`);
  need(L.creator?.top?.every((v) => v.id && v.t && v.g >= 0), "a top video lacks id / title / gain");
  need(L.creator?.themes?.every((t) => t.share >= 0 && t.share <= 1), "theme share outside 0..1");
  need(Array.isArray(L.trends?.today), "trends missing");
}
const I = readJson("ideas.json", null);
need(I?.cards?.length >= 1, "ideas.json has no cards");
const runs = readJson("state/runs.json", {});
for (const [name, r] of Object.entries(runs)) if (r.lastError && (!r.at || r.errorAt > r.at)) log(`note: ${name} last failed: ${r.lastError}`);
if (problems.length) {
  console.error("DATA PROBLEMS:\n- " + problems.join("\n- "));
  process.exit(1);
}
log("data files look right");
