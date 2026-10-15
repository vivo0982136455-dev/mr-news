// Check the REAL site on GitHub Pages: node tests/live.mjs
// Every page at phone and computer width, light and dark: no errors, nothing wider than the screen, charts drawn,
// and the data files are fresh.
import { launch } from "./browser.mjs";
import { LAYOUT_CHECK } from "./checks.mjs";

const BASE = process.env.SITE || "https://vivo0982136455-dev.github.io/mr-news/";
const ROUTES = ["", "news", "idea", "handbook", "human", "ai", "learn", "notes"];
let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { if (cond) pass++; else { fail++; console.log("  ✗ " + name + (extra ? " — " + extra : "")); } };

const latest = await (await fetch(BASE + "data/latest.json", { cache: "no-store" })).json();
const ageH = (Date.now() - Date.parse(latest.updated)) / 3600e3;
console.log(`data: updated ${latest.updated} (${ageH.toFixed(1)} h ago), ${latest.creator.top.length} creator videos, measured ${latest.measured}`);
ok(ageH < 30, "data is fresher than 30 hours", ageH.toFixed(1) + " h");

const browser = await launch({ port: 9448 });
try {
  for (const [w, hgt] of [[380, 820], [1440, 900]]) for (const dark of [false, true]) {
    const page = await browser.newPage({ width: w, height: hgt });
    await page.size(w, hgt, dark);
    for (const r of ROUTES) {
      page.errors.length = 0;
      await page.goto(BASE + "#/" + r, 3000);
      const problems = await page.eval(LAYOUT_CHECK);
      ok(!problems.length && !page.errors.length, `live ${w}px ${dark ? "dark" : "light"} #/${r}`, [...problems, ...page.errors].join(" | "));
    }
    if (w === 380 && !dark) await page.shot("live-380-light.png");
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`\n${fail ? "❌" : "✅"} live: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
