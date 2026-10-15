// Check the REAL site on GitHub Pages: node tests/live.mjs
// Every page at phone and computer width, light and dark: no errors, nothing wider than the screen, charts drawn,
// and the data files are fresh.
import { launch, sleep } from "./browser.mjs";
import { LAYOUT_CHECK } from "./checks.mjs";

const BASE = process.env.SITE || "https://vivo0982136455-dev.github.io/mr-news/";
const ROUTES = ["", "news", "idea", "handbook", "human", "ai", "learn", "notes", "start", "plan", "results", "ladder", "review"];
let pass = 0, fail = 0, slowest = 0;
const ok = (cond, name, extra = "") => { if (cond) pass++; else { fail++; console.log("  ✗ " + name + (extra ? " — " + extra : "")); } };

const latest = await (await fetch(BASE + "data/latest.json", { cache: "no-store" })).json();
// fresh = YouTube was READ recently ("updated" is only when the file was rebuilt, every 6 h)
const ageH = (Date.now() - Date.parse(latest.ytAt || latest.updated)) / 3600e3;
console.log(`data: YouTube read ${latest.ytAt} (${ageH.toFixed(1)} h ago), built ${latest.updated}, ${latest.creator.top.length} creator videos, measured ${latest.measured}`);
ok(latest.ytAt, "latest.json says when YouTube was read");
ok(ageH < 36, "YouTube data is fresher than 36 hours", ageH.toFixed(1) + " h");

const browser = await launch({ port: 9448 });
try {
  for (const [w, hgt] of [[380, 820], [1440, 900]]) for (const dark of [false, true]) {
    const page = await browser.newPage({ width: w, height: hgt });
    await page.size(w, hgt, dark);
    for (const r of ROUTES) {
      page.errors.length = 0;
      await page.goto(BASE + "#/" + r, 300);
      const t0 = Date.now();
      // wait for the page itself (a fixed sleep failed on slow networks while the page still said "กำลังเปิด…");
      // a page that never opens still fails after 15 s
      await page.until(`document.querySelector("main h1") || document.querySelector("main").innerText.includes("เปิดหน้านี้ไม่ได้")`, 15000);
      slowest = Math.max(slowest, Date.now() - t0 + 300);
      await sleep(1000); // charts draw after the heading
      const problems = await page.eval(LAYOUT_CHECK);
      ok(!problems.length && !page.errors.length, `live ${w}px ${dark ? "dark" : "light"} #/${r}`, [...problems, ...page.errors].join(" | "));
    }
    if (w === 380 && !dark) await page.shot("live-380-light.png");
    await page.close();
  }
  // can the real site be installed as an app?
  const a = await browser.newPage({ width: 380, height: 820 });
  await a.goto(BASE, 3000);
  ok(await a.until(`navigator.serviceWorker && navigator.serviceWorker.controller`, 20000), "live: the app's service worker takes control");
  const inst = await a.cdp("Page.getInstallabilityErrors");
  ok(!inst.installabilityErrors.length, "live: Edge says the site can be installed", JSON.stringify(inst.installabilityErrors));
  for (const f of ["manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"]) {
    ok((await fetch(BASE + f, { method: "HEAD" })).ok, `live: ${f} is published`);
  }
  await a.close();
} finally {
  await browser.close();
}
console.log(`slowest page to open: ${(slowest / 1000).toFixed(1)} s`);
console.log(`\n${fail ? "❌" : "✅"} live: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
