// Every check in one command:  node tests/all.mjs   (quick: node tests/all.mjs quick = one width, one theme)
// 1. content: lesson ids, lesson videos, figures, widgets all exist
// 2. data: the robot's files have the shape the pages need
// 3. real Edge: every page x 3 widths x light/dark - no errors, nothing wider than the screen, every chart drawn,
//    chart and picture text inside its box; then real clicks (save a note, switch views, calculators, read ticks)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { serve } from "./serve.mjs";
import { launch, sleep } from "./browser.mjs";
import { LAYOUT_CHECK } from "./checks.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const quick = process.argv.includes("quick");
let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { if (cond) pass++; else { fail++; console.log("  ✗ " + name + (extra ? " — " + extra : "")); } };
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const json = (p) => JSON.parse(read(p));

// ---------------------------------------------------------------- 1. content
console.log("1. content");
const book = read("js/book.js");
const ids = Object.fromEntries([...book.matchAll(/(\w+): \[("hb|"hu|"ai)[^\]]*\]/g)].map((m) => [m[1], JSON.parse(m[0].slice(m[0].indexOf("[")))]));
const learnCfg = json("config/learn.json");
const figures = read("js/content/figures.js");
const widgets = read("js/content/widgets.js");
for (const ch of ["handbook", "human", "ai"]) {
  const src = read(`js/content/${ch}.js`);
  const lessonIds = [...src.matchAll(/^\s{4}id: "([\w-]+)"/gm)].map((m) => m[1]);
  ok(JSON.stringify(lessonIds) === JSON.stringify(ids[ch]), `${ch}: lesson ids match book.js`, lessonIds.join(","));
  for (const m of src.matchAll(/learn: "([\w-]+)"/g)) ok(learnCfg.lessons[m[1]], `${ch}: lesson video key ${m[1]} is in config/learn.json`);
  for (const m of src.matchAll(/figure: "([\w-]+)"/g)) ok(figures.includes(`"${m[1]}":`), `${ch}: figure ${m[1]} exists`);
  for (const m of src.matchAll(/widget: "([\w-]+)"/g)) ok(new RegExp(`(^|\\s)"?${m[1]}"?\\(\\)`, "m").test(widgets), `${ch}: widget ${m[1]} exists`);
  for (const m of src.matchAll(/\]\((.*?)\)/g)) ok(/^https:\/\//.test(m[1]), `${ch}: link is https`, m[1]);
  for (const m of src.matchAll(/\["[^"]+", "(http[^"]+)"\]/g)) ok(m[1].startsWith("https://"), `${ch}: source is https`, m[1]);
}
const { THEMES } = await import(pathToFileURL(path.join(ROOT, "js/shared/themes.js")).href);
const { IDEAS } = await import(pathToFileURL(path.join(ROOT, "js/shared/ideabank.js")).href);
for (const t of THEMES) ok(IDEAS[t.id]?.couple?.length && IDEAS[t.id]?.ai?.length, `idea bank has couple + AI ideas for ${t.id}`);
for (const [id, b] of Object.entries(IDEAS)) for (const i of [...b.couple, ...b.ai]) ok(i.t && i.hook && i.plan?.length && i.why, `idea complete: ${id} / ${i.t}`);
// the key must never be inside the project
ok(!fs.readdirSync(ROOT).some((f) => /key/i.test(f) && f.endsWith(".txt")), "no key file inside the project folder");
ok(read(".gitignore").includes("youtube_key.txt"), ".gitignore guards the key file");

// ---------------------------------------------------------------- 2. data
console.log("2. data");
const L = json("data/latest.json");
ok(L.updated && L.day, "latest.json has updated + day");
ok(L.creator.top.length >= 50, "creator top has 50+ videos", L.creator.top.length);
ok(L.creator.top.every((v) => v.id && v.t && v.g >= 0 && Array.isArray(v.themes)), "every top video has id, title, gain, themes");
ok(L.creator.top.every((v, i, a) => !i || a[i - 1].g >= v.g), "top list is sorted by gain");
ok(L.creator.themes.length >= 5 && L.creator.themes.every((t) => t.share >= 0 && t.share <= 1), "theme shares are 0..1");
ok(L.creator.hours.length === 24, "24 posting hours");
ok(L.lao && Array.isArray(L.lao.top), "Lao block present");
ok(Array.isArray(L.trends.today), "Google Trends today present");
const I = json("data/ideas.json");
ok(I.cards.length >= 3 && I.cards.every((c) => c.couple && c.ai), "ideas: 3+ cards with both ideas");
const F = json("data/famous.json");
ok(F.youtube?.length >= 50 && F.youtube.every((x) => x.name && x.m > 0), "famous: YouTube list ok");
const LE = json("data/learn.json");
ok(Object.keys(LE.lessons || {}).length >= 10, "learn: lesson videos chosen", Object.keys(LE.lessons || {}).length);
const idx = json("data/index.json");
ok(idx.days.length >= 1 && idx.months.length >= 1 && idx.years.length >= 1, "index lists days, months, years");
for (const d of idx.days) ok(fs.existsSync(path.join(ROOT, "data/days", d + ".json")), `day file ${d} exists`);

// ---------------------------------------------------------------- 3. browser
console.log("3. browser");
const PORT = 8790;
const server = await serve(PORT);
const browser = await launch({ port: 9447 });
const BASE = `http://127.0.0.1:${PORT}/`;
const ROUTES = ["", "news", "idea", "handbook", "human", "ai", "learn", "notes"];
const SIZES = quick ? [[380, 820]] : [[380, 820], [768, 1024], [1440, 900]];
const THEMES_ = quick ? [false] : [false, true];

// LAYOUT_CHECK lives in checks.mjs (shared with tests/live.mjs)

try {
  for (const [w, hgt] of SIZES) for (const dark of THEMES_) {
    const page = await browser.newPage({ width: w, height: hgt });
    await page.size(w, hgt, dark);
    for (const r of ROUTES) {
      page.errors.length = 0;
      await page.goto(BASE + "#/" + r, 1800);
      const problems = await page.eval(LAYOUT_CHECK);
      ok(!problems.length && !page.errors.length, `${w}px ${dark ? "dark" : "light"} #/${r}`, [...problems, ...page.errors].join(" | "));
    }
    // the other news views
    await page.goto(BASE + "#/news", 1800);
    for (const label of ["รายเดือน", "รายปี", "ลาว", "ครีเอเตอร์", "วันนี้"]) {
      page.errors.length = 0;
      await page.eval(`[...document.querySelectorAll(".seg button")].find(b => b.textContent === ${JSON.stringify(label)}).click(); return true;`);
      await sleep(1200);
      const problems = await page.eval(LAYOUT_CHECK);
      ok(!problems.length && !page.errors.length, `${w}px ${dark ? "dark" : "light"} news view "${label}"`, [...problems, ...page.errors].join(" | "));
    }
    if (w >= 768) ok(await page.eval(`return ![...document.querySelector(".chart svg").querySelectorAll("text.lbl")].some(t => t.textContent.includes("…"));`), `${w}px: theme names are not cut short on a wide screen`);
    if (w === 380 || w === 1440) await page.shot(`news-${w}-${dark ? "dark" : "light"}.png`);
    await page.close();
  }

  // ---- real clicks ----
  const p = await browser.newPage({ width: 380, height: 820 });
  await p.goto(BASE + "#/news", 2000);
  await p.eval(`localStorage.clear(); return true;`);
  await p.goto(BASE + "#/news", 2000);
  ok(await p.until(`document.querySelector(".vcard button")`, 20000), "news page shows video cards"); // a slow network must not crash the run
  await p.eval(`[...document.querySelectorAll(".vcard button")].find(b => b.textContent.includes("จดลงสมุด"))?.click(); return true;`);
  ok(await p.until(`JSON.parse(localStorage.getItem("mn_notes") || "[]").length === 1`), "📌 on a video card saves one note");
  await p.goto(BASE + "#/notes", 1500);
  ok(await p.eval(`return document.querySelectorAll(".note-item").length === 1;`), "the note shows in the notebook");
  await p.eval(`const f = document.querySelector("form.form"); f.querySelector("input").value = "ทดสอบโน้ต"; f.requestSubmit(); return true;`);
  ok(await p.until(`document.querySelectorAll(".note-item").length === 2`), "a typed note is saved and listed");
  await p.eval(`document.querySelector('input[type=search]').value = "ทดสอบ"; document.querySelector('input[type=search]').dispatchEvent(new Event("input")); return true;`);
  ok(await p.eval(`return document.querySelectorAll(".note-item").length === 1;`), "notebook search filters");

  await p.goto(BASE + "#/handbook", 2000);
  await p.eval(`const i = [...document.querySelectorAll("label")].find(l => l.textContent.startsWith("ผู้ติดตาม")).querySelector("input"); i.value = 600; i.dispatchEvent(new Event("input")); return true;`);
  ok(await p.until(`document.querySelector("#hb-youtube").innerText.includes("600 / 500")`), "YouTube progress calculator reacts");
  await p.eval(`const i = [...document.querySelectorAll("label")].find(l => l.textContent.startsWith("ยอดวิว")).querySelector("input"); i.value = 1000000; i.dispatchEvent(new Event("input")); return true;`);
  ok(await p.until(`document.querySelector("#hb-calc").innerText.includes("12,210")`), "money calculator: 1,000,000 long views ≈ 12,210 ฿ (0.37 $ × 33)");
  await p.eval(`document.querySelector("#hb-start .done-btn").click(); return true;`);
  ok(await p.eval(`return document.querySelectorAll(".toc a.done").length === 1;`), "reading tick marks the lesson in the table of contents");
  await p.goto(BASE + "#/", 1500);
  ok(await p.eval(`return document.querySelector("main").innerText.includes("อ่านแล้ว 1/9");`), "cover shows chapter progress");

  await p.goto(BASE + "#/idea", 1800);
  const firstName = await p.eval(`return document.querySelector(".idea h3").textContent;`);
  ok(await p.eval(`return document.querySelector(".prompt pre").textContent.includes(${JSON.stringify("")}) && document.querySelector(".prompt pre").textContent.includes("หมวด");`), "Gemini prompt is built", firstName);
  const before = await p.eval(`return document.documentElement.getAttribute("data-theme");`);
  await p.eval(`document.querySelector(".theme-btn").click(); return true;`);
  ok((await p.eval(`return document.documentElement.getAttribute("data-theme");`)) !== before, "theme button changes the theme");
  await p.goto(BASE + "#/human", 1800);
  await p.eval(`document.querySelector(".embed button")?.click(); return true;`);
  ok(await p.until(`document.querySelector(".embed iframe")`), "a lesson video loads YouTube only after the tap");
  await p.eval(`localStorage.clear(); return true;`);
  await p.close();
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${fail ? "❌" : "✅"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
