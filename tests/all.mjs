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
  for (const m of src.matchAll(/widget: "([\w-]+)"/g)) ok(new RegExp(`(^|\\s)"?${m[1]}"?\\(\\w*\\)`, "m").test(widgets), `${ch}: widget ${m[1]} exists`);
  for (const m of src.matchAll(/\]\((.*?)\)/g)) ok(/^https:\/\//.test(m[1]), `${ch}: link is https`, m[1]);
  for (const m of src.matchAll(/\["[^"]+", "(http[^"]+)"\]/g)) ok(m[1].startsWith("https://"), `${ch}: source is https`, m[1]);
}
const { THEMES } = await import(pathToFileURL(path.join(ROOT, "js/shared/themes.js")).href);
const { IDEAS } = await import(pathToFileURL(path.join(ROOT, "js/shared/ideabank.js")).href);
for (const t of THEMES) ok(IDEAS[t.id]?.couple?.length && IDEAS[t.id]?.ai?.length, `idea bank has couple + AI ideas for ${t.id}`);
for (const [id, b] of Object.entries(IDEAS)) for (const i of [...b.couple, ...b.ai]) ok(i.t && i.hook && i.plan?.length && i.why, `idea complete: ${id} / ${i.t}`);
for (const [id, b] of Object.entries(IDEAS)) ok(b.couple.length >= 7 && b.ai.length >= 7, `idea bank: 7+ ideas per page for ${id} (no repeat within a week)`, `${b.couple.length} / ${b.ai.length}`);
const allTitles = Object.values(IDEAS).flatMap((b) => [...b.couple, ...b.ai].map((i) => i.t));
ok(new Set(allTitles).size === allTitles.length, "idea bank: no idea twice", allTitles.length);
ok(!allTitles.some((t) => /หลาน/.test(t)), "idea bank: no idea that films children (the filming chapter forbids it)");

// Win's own work: the streak with freezes, weeks, title styles
const { streakOf, median } = await import(pathToFileURL(path.join(ROOT, "js/my-store.js")).href);
ok(median([1000, 3000]) === 2000 && median([1, 5, 2]) === 2 && median([]) === null, "median: even count = average of the middle two");
const { weekOf, titleStyles } = await import(pathToFileURL(path.join(ROOT, "js/shared/patterns.js")).href);
const D = { items: [{ posted: true }] }, M = { items: [{ posted: false }] };
ok(weekOf("2026-10-15") === "2026-10-12" && weekOf("2026-10-12") === "2026-10-12" && weekOf("2026-10-18") === "2026-10-12", "a week starts on Monday (Thai days)");
ok(streakOf({ "2026-10-19": D, "2026-10-26": D, "2026-11-02": D }, "2026-11-09").streak === 3, "streak: 3 finished weeks = 3");
const sf = streakOf({ "2026-10-19": D, "2026-10-26": M, "2026-11-02": D }, "2026-11-09");
ok(sf.streak === 2 && sf.frozen === 1, "streak: one missed week uses a freeze, the streak goes on", JSON.stringify(sf));
ok(streakOf({ "2026-10-05": D }, "2026-11-09").streak === 0, "streak: after the 2 freezes are used up, a missed week resets it");
ok(streakOf({ "2026-11-09": D }, "2026-11-09").streak === 1, "streak: this week counts the moment it is finished");
ok(JSON.stringify(titleStyles("ทำไมแมวกลัวแตงกวา? #cat")) === '["question"]' && titleStyles("เมื่อแฟนบอก “ไม่กิน” 5 เมนู").join(",") === "story,number,quote", "title styles are read from the title");
// the theme reader on real titles (tests/themes-cases.mjs): traps must all be right; real titles measured
const { themesOf, isCopyText, SENSITIVE, MEDIA_CHANNEL: MEDIA } = await import(pathToFileURL(path.join(ROOT, "js/shared/themes.js")).href);
const { CASES, TRAPS, HELD_OUT } = await import(pathToFileURL(path.join(ROOT, "tests/themes-cases.mjs")).href);
for (const c of TRAPS) ok(JSON.stringify(themesOf(c.t).sort()) === JSON.stringify([...c.want].sort()), `theme trap: "${c.t}" -> ${c.want.join(",") || "none"}`, themesOf(c.t).join(","));
const score = (cases) => {
  let found = 0, want = 0;
  const wrong = [];
  for (const c of cases) {
    const got = themesOf(c.t);
    for (const w of c.want) { want++; if (got.includes(w)) found++; }
    for (const g of got) if (!c.want.includes(g) && !c.may.includes(g)) wrong.push(`${g} <- ${c.t.slice(0, 40)}`);
  }
  return { rate: found / want, wrong };
};
const sc = score(CASES), sh = score(HELD_OUT);
console.log(`   themes: tuning set ${(sc.rate * 100).toFixed(0)}% found, ${sc.wrong.length} wrong · held-out set ${(sh.rate * 100).toFixed(0)}% found, ${sh.wrong.length} wrong`);
ok(sc.rate >= 0.88 && sc.wrong.length <= 2, "themes on 120 labelled real titles: 88%+ found, at most 2 wrong", sc.wrong.join(" | "));
ok(sh.rate >= 0.8 && sh.wrong.length <= 5, "themes on 60 held-out real titles: 80%+ found, at most 5 wrong", sh.wrong.join(" | "));
for (const [t, cn, want] of [["เมื่อเด็กหญิงกลายเป็นครู #สปอยหนัง", "", true], ["Coraline EP.6 พากย์ไทย", "", true], ["เลี้ยงรุ่นพลิกชีวิต", "มิมิละครสั้นAi", true],
  ["【ศึกรักคู่แค้น】11", "", true], ["ลืมอะไรไม่ลืม #ละครสั้น #คลิปตลก", "", false], ["แข่งชาเลนจ์ ใครตอบถูกได้กิน", "Bie The Ska", false], ["ส่ง email ai", "", false]])
  ok(isCopyText(t, cn) === want, `copy rule: "${t}" ${want ? "is" : "is not"} dubbed / spoiler / re-up`);
ok(SENSITIVE.test("สภาลาวเดือดเมื่อส.ส. เสนอ") && SENSITIVE.test("นายกฯ สั่งย้าย") && !SENSITIVE.test("แฟนแกล้งกินส้มตำ"), "news / politics words are caught, daily titles are not");
ok(MEDIA.test("3Plus") && MEDIA.test("Sanook.com") && MEDIA.test("LungNoteTV") && MEDIA.test("Thai PBS") && !MEDIA.test("Bie The Ska") && !MEDIA.test("Milin family"), "media channels the audit found are filtered, creators are not");

// the book as a ladder: every lesson has "ทำเลย" + 2-3 questions, every lesson sits on a step, steps join up
const { QUIZ } = await import(pathToFileURL(path.join(ROOT, "js/content/quiz.js")).href);
const { STAGES, stageOf, BADGES } = await import(pathToFileURL(path.join(ROOT, "js/content/ladder.js")).href);
const allLessons = Object.values(ids).flat();
for (const id of allLessons) {
  const z = QUIZ[id];
  ok(z && z.now && z.q.length >= 2 && z.q.every((x) => x.q && x.a.length === 3 && new Set(x.a).size === 3 && x.why), `lesson ${id}: "ทำเลย" + 2-3 questions with 3 different answers and a reason`);
}
ok(Object.keys(QUIZ).every((id) => allLessons.includes(id)), "no questions for a lesson that does not exist", Object.keys(QUIZ).filter((id) => !allLessons.includes(id)).join(","));
const onLadder = new Set(STAGES.flatMap((s) => s.lessons));
ok([...onLadder].every((id) => allLessons.includes(id)), "every lesson the ladder links to exists", [...onLadder].filter((id) => !allLessons.includes(id)).join(","));
ok(allLessons.every((id) => onLadder.has(id)), "every lesson of the book sits on a step of the ladder", allLessons.filter((id) => !onLadder.has(id)).join(","));
ok(STAGES.every((s, i) => !i || STAGES[i - 1].to === s.from) && STAGES[0].from === 0, "the 5 steps join up (clips)");
ok(stageOf(0).n === 0 && stageOf(2).n === 0 && stageOf(3).n === 1 && stageOf(29).n === 1 && stageOf(30).n === 2 && stageOf(100).n === 3 && stageOf(250).n === 4, "finished clips -> the right step");
ok(new Set(BADGES.map((b) => b.id)).size === BADGES.length && BADGES.length >= 8, "badges have unique ids");
for (const ch of ["handbook", "human", "ai"]) ok(/export const CHECKED = "\d{4}-\d{2}-\d{2}"/.test(read(`js/content/${ch}.js`)), `${ch}: says when its facts were last checked`);
ok(read("js/content/handbook.js").includes("ยังเคลื่อนไหว") && read("js/content/handbook.js").includes("2 คลิป / Shorts 5 คลิป ทุก 90 วัน"), "YouTube 2027 'active channel' rule is in the book");
ok(!/~189 ฿/.test(read("js/content/ai.js") + read("js/content/widgets.js")), "no unconfirmed fixed price for Google AI Plus");
ok(read("js/content/handbook.js").includes('id: "hb-money"') && read("js/content/handbook.js").includes("ภ.ง.ด.94"), "the Thai-Lao money lesson exists (affiliate, tax, work permit)");
// the review schedule: 1, 3, 7 days, then remembered; a wrong answer starts again from 1 day
globalThis.localStorage = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = String(v); }, removeItem(k) { delete this.d[k]; } };
const { answerQuiz, dueQuestions, remembered } = await import(pathToFileURL(path.join(ROOT, "js/my-store.js")).href);
const s1 = answerQuiz("t#0", true, "2026-10-15"), s2 = answerQuiz("t#0", true, "2026-10-16"), s3 = answerQuiz("t#0", true, "2026-10-19"), s4 = answerQuiz("t#0", true, "2026-10-26");
ok(s1.due === "2026-10-16" && s2.due === "2026-10-19" && s3.due === "2026-10-26" && s4.due === null && remembered() === 1, "review: asked again after 1, 3 and 7 days, then remembered", JSON.stringify([s1.due, s2.due, s3.due, s4.due]));
ok(answerQuiz("w#0", false, "2026-10-15").due === "2026-10-16" && dueQuestions("2026-10-16").includes("w#0"), "review: a wrong answer comes back tomorrow");
delete globalThis.localStorage;

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

// 2b. the NUMBERS are right (the first 205 checks passed while a day was a copy and October was doubled)
console.log("2b. numbers");
const { checkData } = await import(pathToFileURL(path.join(ROOT, "scripts/check-data.mjs")).href);
const dataProblems = checkData().filter((p) => !/^YouTube (not read|'s last run failed)/.test(p)); // freshness is the robot's job
ok(!dataProblems.length, "robot's data check: no copied day, months = sum of their own days, ideas present", dataProblems.join(" | "));
const thai = (iso) => new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 10);
ok(L.ytAt && L.day === thai(L.ytAt), "latest.day is the Thai day YouTube was read (not the day the file was built)", `${L.day} vs ${L.ytAt}`);
ok(Date.parse(L.ytAt) <= Date.parse(L.updated), "YouTube read time is not after the build time");
ok(idx.days.every((d) => d <= L.day), "no day file is newer than the last YouTube read", idx.days.join(","));
const months = idx.months.map((m) => json(`data/months/${m}.json`));
for (const m of months) ok(m.total === m.days.reduce((a, d) => a + json(`data/days/${d}.json`).creator.total, 0), `month ${m.period}: total = sum of its days, each once`);
ok((L.pastDays ?? 0) >= 7 || L.creator.themes.every((t) => t.prev == null), "no '▲ from 7 days' before 7 real days exist", `pastDays ${L.pastDays}`);
ok((I.pastDays ?? 0) >= 7 || I.cards.every((c) => c.momentum == null), "ideas show no momentum before 7 real days");
ok(I.ytAt === L.ytAt, "ideas carry the same YouTube read time as Mr News");
// the creator ranking holds original creators only, and says how sure each number is
const rows = [...L.creator.top, ...(L.creator.outliers || []), ...(L.creator.sure || [])];
ok(rows.every((v) => !isCopyText(v.t, v.cn) && !SENSITIVE.test(v.t) && !MEDIA.test(v.cn)), "creator lists: no dubbed / spoiler / re-up, no news or politics, no media channel",
  rows.filter((v) => isCopyText(v.t, v.cn) || SENSITIVE.test(v.t) || MEDIA.test(v.cn)).map((v) => v.t.slice(0, 30)).join(" | "));
ok(rows.every((v) => ["m", "n", "e"].includes(v.q)), "every ranked video says measured / new / estimate");
ok((L.creator.sure || []).every((v) => v.q !== "e"), "the 'numbers we can stand behind' list has no estimates");
ok((L.creator.outliers || []).every((v, i, a) => v.x > 0 && (!i || a[i - 1].x >= v.x)), "the ×N list is sorted by ×N");
const chCfg = json("config/channels.json");
ok((L.copies || []).length > 0 && L.copies.every((v) => isCopyText(v.t, v.cn) || chCfg.copy[v.ch]) && L.counts.copies >= L.copies.length, "dubbed / spoiler clips are kept apart, each for a reason, and counted");
ok(L.lao.top.every((v) => !SENSITIVE.test(v.t)), "Lao creator list has no news / politics titles", L.lao.top.filter((v) => SENSITIVE.test(v.t)).map((v) => v.t.slice(0, 30)).join(" | "));
ok(L.sample?.searches >= 20 && L.sample.words.length === L.sample.searches, "latest.json says which search words the sample comes from");
ok(L.creator.none >= 0 && L.creator.none < 1, "share of views with no theme is reported");
const { lessonFits, MAX_SEC } = await import(pathToFileURL(path.join(ROOT, "scripts/fetch-learn.mjs")).href);
for (const [k, l] of Object.entries(LE.lessons)) {
  const c = learnCfg.lessons[k];
  if (!c) continue;
  for (const v of l.vids) ok((c.pinned || []).includes(v.id) || lessonFits(v.t, v.d, c.must, c.not), `lesson ${k}: video fits the lesson`, `${v.t} (${Math.round(v.d / 60)} min)`);
  ok(l.vids.every((v) => v.d <= MAX_SEC), `lesson ${k}: no video longer than 30 min`);
}

// ---------------------------------------------------------------- 3. browser
console.log("3. browser");
const PORT = 8790;
const server = await serve(PORT);
const browser = await launch({ port: 9447 });
const BASE = `http://127.0.0.1:${PORT}/`;
const ROUTES = ["", "news", "idea", "handbook", "human", "ai", "learn", "notes", "start", "plan", "results", "ladder", "review"];
const SIZES = quick ? [[380, 820]] : [[380, 820], [768, 1024], [1440, 900]];
const THEMES_ = quick ? [false] : [false, true];
let slowest = 0;

// LAYOUT_CHECK lives in checks.mjs (shared with tests/live.mjs)

try {
  for (const [w, hgt] of SIZES) for (const dark of THEMES_) {
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
      await sleep(600); // charts draw after the heading
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
    if (w === 380) {
      // the estimate labels open on a TAP and stay inside a phone screen
      await page.eval(`window.__est = [...document.querySelectorAll(".info.est")].find((b) => b.nextElementSibling.textContent.includes("÷ ชั่วโมง")); window.__est.click(); return true;`);
      await sleep(200);
      const problems = await page.eval(LAYOUT_CHECK);
      ok(await page.eval(`return !window.__est.nextElementSibling.hidden && window.__est.nextElementSibling.textContent.includes("ยอดวิวทั้งหมด ÷ ชั่วโมง");`), `${w}px ${dark ? "dark" : "light"}: tapping "ประมาณ" shows how it is worked out`);
      ok(!problems.length, `${w}px ${dark ? "dark" : "light"}: open explanation fits the screen`, problems.join(" | "));
      await page.shot(`news-est-${dark ? "dark" : "light"}.png`);
    }
    await page.close();
  }

  // ---- the creator ranking: sort / length / flag ----
  const k = await browser.newPage({ width: 380, height: 820 });
  await k.goto(BASE + "#/news", 300);
  await k.eval(`localStorage.clear(); return true;`);
  await k.goto(BASE + "#/notes", 300);
  await k.eval(`location.hash = "#/news"; return true;`);
  ok(await k.until(`[...document.querySelectorAll(".seg button")].some(b => b.textContent === "×N ของปกติช่อง")`, 15000), "ranking offers ×N and 24 h views");
  ok(await k.eval(`return document.querySelector(".vcard .info.x") !== null && document.querySelector(".vcard .looks") !== null;`), "ranked cards show ×N and what can be seen in the clip");
  await k.eval(`[...document.querySelectorAll(".seg button")].find(b => b.textContent === "Shorts").click(); return true;`);
  await sleep(300);
  ok(await k.eval(`return [...document.querySelectorAll(".section .vlist")][0].querySelectorAll(".vcard").length > 0 && [...document.querySelectorAll(".section .vlist")][0].innerText.includes("คลิปยาว") === false;`), "Shorts filter shows Shorts only");
  await k.eval(`[...document.querySelectorAll(".seg button")].find(b => b.textContent === "ทุกความยาว").click(); [...document.querySelectorAll(".seg button")].find(b => b.textContent === "วิว 24 ชม.").click(); return true;`);
  await sleep(300);
  ok(await k.eval(`return [...document.querySelectorAll(".seg button")].some(b => b.textContent === "เฉพาะตัวเลขจริง") && ![...document.querySelectorAll(".section .vlist")][0].querySelector(".info.est");`), "24 h views + 'numbers we can stand behind' shows no estimate");
  const firstCh = await k.eval(`return [...document.querySelectorAll(".section .vlist")][0].querySelector(".vcard .meta").textContent.split(" · ")[0];`);
  await k.eval(`[...document.querySelectorAll(".section .vlist")][0].querySelector(".vcard button[title*='ต้นฉบับ']").click(); return true;`);
  await sleep(300);
  ok(await k.eval(`return Object.keys(JSON.parse(localStorage.getItem("mn_flagged") || "{}")).length === 1 && document.querySelector("main").innerText.includes("ซ่อนไว้ 1 ช่อง");`), "🚩 hides a channel on this device and says so", firstCh);
  const flaggedName = await k.eval(`return Object.values(JSON.parse(localStorage.getItem("mn_flagged") || "{}"))[0];`);
  ok(await k.eval(`const n = ${JSON.stringify(flaggedName)}; return ![...[...document.querySelectorAll(".section .vlist")][0].querySelectorAll(".vcard .meta")].some((m) => m.textContent.startsWith(n + " · "));`), "the flagged channel is gone from the list", flaggedName);
  ok(await k.eval(`return [...document.querySelectorAll("h2")].some(h => h.textContent.includes("พากย์ / สปอย / รีอัป"));`), "dubbed / spoiler clips are shown apart");
  ok(await k.eval(`return document.querySelector(".page-head").innerText.includes("คำค้น");`), "news head says the numbers come from the robot's search words");
  const layout = await k.eval(LAYOUT_CHECK);
  ok(!layout.length, "380px: ranking controls fit the screen", layout.join(" | "));
  await k.shot("news-rank-380.png");
  await k.goto(BASE + "#/handbook", 300);
  ok(await k.until(`document.querySelector("main").innerText.includes("Mr News วันที่")`, 15000), "lesson numbers are read from today's data (no fixed 86%)");
  await k.eval(`localStorage.clear(); return true;`);
  await k.close();

  // ---- from reading to doing: setup, today, weekly plan, Mr Idea tools, results + Sunday review, backup ----
  const c = await browser.newPage({ width: 380, height: 820 });
  await c.goto(BASE + "#/notes", 300);
  await c.eval(`localStorage.clear(); return true;`);
  await c.goto(BASE + "#/plan", 300);
  await c.eval(`location.hash = "#/"; return true;`);
  ok(await c.until(`document.querySelector("form.setup")`, 15000), "first visit: the cover asks the 3 setup questions");
  await c.eval(`const f = document.querySelector("form.setup");
    [...f.querySelectorAll("button")].find((b) => b.textContent.includes("คู่รัก")).click();
    [...f.querySelectorAll("button")].find((b) => b.textContent === "Shorts / Reels").click();
    [...f.querySelectorAll("button")].find((b) => b.textContent === "10 นาที").click();
    const [when, what] = f.querySelectorAll("input[type=text]"); when.value = "เลิกกะ"; what.value = "ถ่ายท่อนสั้น 3 ท่อน";
    f.requestSubmit(); return true;`);
  ok(await c.until(`document.querySelector(".today")`, 8000), "after the answers the cover shows \"วันนี้ของ Win\"");
  const today = await c.eval(`return document.querySelector(".today").innerText;`);
  ok(today.includes("หลังจากเลิกกะ ฉันจะถ่ายท่อนสั้น 3 ท่อน"), "today card repeats Win's plan sentence", today.slice(0, 120));
  ok(today.includes("ถ่ายท่อนสั้นชีวิตจริง 3 ท่อน"), "10 minutes a day + empty plan -> the 10-minute task");
  ok(await c.eval(`return document.querySelectorAll(".today .vcard").length === 3 && document.querySelectorAll(".today .vcard .info.x").length === 3;`), "today card: 3 clips far above their channel's usual");
  ok(await c.eval(`const s = JSON.parse(localStorage.getItem("mn_setup")); return s.themes[0] === "couple" && s.format === "short" && s.minutes === 10;`), "setup answers are kept in this browser");
  const layoutToday = await c.eval(LAYOUT_CHECK);
  ok(!layoutToday.length, "380px: the today card fits the screen", layoutToday.join(" | "));
  await c.shot("today-380.png");
  await c.eval(`[...document.querySelectorAll(".today button")].find((b) => b.textContent.includes("ใส่แผนสัปดาห์")).click(); return true;`);
  ok(await c.until(`document.querySelector(".today").innerText.includes("0/1 โพสต์แล้ว")`, 8000), "➕ from the today card puts the idea in this week's plan");
  ok(await c.eval(`return document.querySelector(".today").innerText.includes("ไอเดีย “");`), "with a plan, the small task becomes the plan's next step");

  await c.goto(BASE + "#/idea", 300);
  ok(await c.until(`document.querySelector(".idea .pattern")`, 15000), "Mr Idea shows today's pattern from real clips");
  const ideaBefore = await c.eval(`return document.querySelector(".idea .side-a .idea-t").textContent;`);
  await c.eval(`[...document.querySelector(".idea .side-a").querySelectorAll("button")].find((b) => b.textContent.startsWith("⏭")).click(); return true;`);
  ok(await c.until(`document.querySelector(".idea .side-a .idea-t").textContent !== ${JSON.stringify(ideaBefore)}`, 3000), "⏭ ข้าม shows the next idea of the same theme", ideaBefore);
  await c.eval(`[...document.querySelector(".idea .side-a").querySelectorAll("button")].find((b) => b.textContent.includes("ใส่แผนสัปดาห์")).click(); return true;`);
  ok(await c.eval(`const p = JSON.parse(localStorage.getItem("mn_plan")); return Object.values(p.weeks)[0].items.length === 2;`), "➕ ใส่แผนสัปดาห์ in Mr Idea adds a second idea");
  ok(await c.eval(`const d = document.querySelector(".idea .script-box"); d.open = true; return d.querySelector("textarea").value.includes("ประโยคเปิด") && d.querySelector("textarea").value.includes("ชื่อคลิป 3 แบบ");`), "📝 แม่แบบบท opens a script to fill in");
  ok(await c.eval(`return document.querySelector("main").innerText.includes("ไม่ใช้เรื่องซุบซิบคนจริง");`), "Google Trends box warns: no gossip about real people");
  const layoutIdea = await c.eval(LAYOUT_CHECK);
  ok(!layoutIdea.length, "380px: Mr Idea with its new buttons fits the screen", layoutIdea.join(" | "));

  await c.goto(BASE + "#/plan", 300);
  ok(await c.until(`document.querySelectorAll(".plan-item").length === 2`, 8000), "the plan page lists the 2 planned ideas");
  await c.eval(`[...document.querySelectorAll(".plan-item")[0].querySelectorAll(".step")].find((l) => l.textContent.includes("โพสต์แล้ว")).querySelector("input").click(); return true;`);
  ok(await c.until(`document.querySelectorAll(".plan-item")[0].querySelectorAll(".step.on").length === 3`, 3000), "ticking โพสต์แล้ว ticks ถ่ายแล้ว and ตัดแล้ว too");
  await c.eval(`[...document.querySelectorAll(".plan-item")[1].querySelectorAll(".step")].find((l) => l.textContent.includes("โพสต์แล้ว")).querySelector("input").click(); return true;`);
  ok(await c.until(`document.querySelector(".celebrate") && document.querySelector("main").innerText.includes("1 สัปดาห์ 🔥")`, 3000), "finishing the week celebrates at once and counts the streak");
  const layoutPlan = await c.eval(LAYOUT_CHECK);
  ok(!layoutPlan.length, "380px: the plan page fits the screen", layoutPlan.join(" | "));
  await c.shot("plan-380.png");

  await c.goto(BASE + "#/results", 300);
  ok(await c.until(`document.querySelector("details.card form.form")`, 8000), "results page offers the clip form");
  const addClip = (t, views) => c.eval(`const f = document.querySelector("details.card form.form");
    f.querySelector("input[type=text]").value = ${JSON.stringify(t)}; f.querySelector("input[type=number]").value = ${views}; f.requestSubmit(); return true;`);
  await addClip("คลิปทดสอบ 1", 1000);
  await c.until(`document.querySelectorAll("table.data tbody tr").length === 1`, 3000);
  await c.eval(`document.querySelector("details.card").open = true; return true;`);
  await addClip("คลิปทดสอบ 2", 3000);
  ok(await c.until(`document.querySelectorAll("table.data tbody tr").length === 2 && document.querySelector("table.data").innerText.includes("×3")`, 3000), "own clips: 3,000 views vs own usual 1,000 shows ×3");
  await c.eval(`const forms = document.querySelectorAll("form"); const f = forms[forms.length - 1];
    f.querySelectorAll("input[type=text]")[0].value = "ถ้าเปิดด้วยคำถาม คนจะดูต่อมากขึ้น"; f.querySelectorAll("input[type=text]")[1].value = "เปิดด้วยคำถามทุกคลิป"; f.requestSubmit(); return true;`);
  ok(await c.until(`JSON.parse(localStorage.getItem("mn_reviews") || "[]").length === 1`, 3000), "the Sunday review is saved");
  await c.eval(`[...document.querySelectorAll("button")].find((b) => b.textContent === "ส่งตัวเลข").click(); return true;`);
  ok(await c.eval(`return JSON.parse(localStorage.getItem("mn_ypp_up")) === 2;`), "results send the YouTube numbers to the YPP calculator");
  const layoutRes = await c.eval(LAYOUT_CHECK);
  ok(!layoutRes.length, "380px: the results page fits the screen", layoutRes.join(" | "));
  await c.shot("results-380.png");

  await c.goto(BASE + "#/notes", 300);
  await c.until(`[...document.querySelectorAll("button")].some((b) => b.textContent.includes("สำรองเป็นไฟล์"))`, 8000);
  const backup = await c.eval(`let blob = null; const real = URL.createObjectURL; URL.createObjectURL = (b) => { blob = b; return "blob:test"; };
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("สำรองเป็นไฟล์")).click();
    URL.createObjectURL = real; return blob ? JSON.parse(await blob.text()) : null;`);
  ok(backup && backup.version === 2 && backup.mine?.mn_plan && backup.mine?.mn_results?.length === 2 && backup.mine?.mn_reviews?.length === 1 && backup.mine?.mn_setup,
    "the backup file carries the setup, plan, results and reviews", JSON.stringify(Object.keys(backup?.mine || {})));
  await c.eval(`localStorage.clear(); return true;`);
  await c.close();

  // ---- the book as a ladder: questions at the end of a lesson, review, steps counted in finished clips, badges ----
  const d = await browser.newPage({ width: 380, height: 820 });
  await d.goto(BASE + "#/notes", 300);
  await d.eval(`localStorage.clear(); return true;`);
  await d.eval(`location.hash = "#/handbook"; return true;`);
  ok(await d.until(`document.querySelector(".lesson-end .quiz-q")`, 15000), "every lesson ends with ทำเลย + questions");
  ok(await d.eval(`return document.querySelector("main").innerText.includes("ตรวจข้อมูลล่าสุด");`), "the chapter says when its facts were last checked");
  ok(await d.eval(`return document.querySelectorAll("#hb-money .quiz-q").length === 3;`), "the money lesson has its 3 questions");
  await d.eval(`const q = document.querySelector("#hb-start .quiz-q"); const right = ${JSON.stringify("คลิปที่คนดูอยู่นานและพอใจ")};
    [...q.querySelectorAll(".opt")].find((b) => b.textContent === right).click(); return true;`);
  ok(await d.eval(`const q = document.querySelector("#hb-start .quiz-q"); return q.querySelector(".opt.right") && q.querySelector(".why.ok") && q.innerText.includes("จะถามอีกครั้งใน 1 วัน");`), "a right answer is confirmed and comes back in 1 day");
  await d.eval(`const q = document.querySelectorAll("#hb-start .quiz-q")[1]; const wrong = ${JSON.stringify("เอาคลิปคนอื่นมาใส่กรอบ")};
    [...q.querySelectorAll(".opt")].find((b) => b.textContent === wrong).click(); return true;`);
  ok(await d.eval(`const q = document.querySelectorAll("#hb-start .quiz-q")[1]; return q.querySelector(".opt.wrong") && q.querySelector(".opt.right") && q.querySelector(".why.no");`), "a wrong answer shows the right one and why");
  ok(await d.eval(`const z = JSON.parse(localStorage.getItem("mn_quiz")); return Object.keys(z).length === 2 && z["hb-start#0"].step === 1;`), "answers are kept for the review");
  // pretend both are due today
  await d.eval(`const z = JSON.parse(localStorage.getItem("mn_quiz")); for (const k in z) z[k].due = "2000-01-01"; localStorage.setItem("mn_quiz", JSON.stringify(z)); location.hash = "#/review"; return true;`);
  ok(await d.until(`document.querySelectorAll(".quiz-q").length === 2`, 8000), "the review page asks the 2 due questions");
  await d.eval(`const q = document.querySelector(".quiz-q"); const right = ${JSON.stringify("คลิปที่คนดูอยู่นานและพอใจ")};
    const b = [...q.querySelectorAll(".opt")].find((x) => x.textContent === right); (b || q.querySelector(".opt")).click(); return true;`);
  ok(await d.eval(`return Object.values(JSON.parse(localStorage.getItem("mn_quiz"))).some((o) => o.step === 2);`), "a right review answer moves the question to the 3-day review");
  const layoutRev = await d.eval(LAYOUT_CHECK);
  ok(!layoutRev.length, "380px: the review page fits the screen", layoutRev.join(" | "));
  // finished clips decide the step; 3 clips = step 1 + a badge
  await d.eval(`localStorage.setItem("mn_results", JSON.stringify([1, 2, 3].map((i) => ({ id: "r" + i, date: "2026-10-1" + i, where: "yt-short", t: "คลิป " + i, views: 100 * i })))); location.hash = "#/ladder"; return true;`);
  ok(await d.until(`document.querySelector(".stage-now") && document.querySelector(".stage-now").innerText.includes("ขั้น 1 · ฝึกมือ")`, 8000), "3 finished clips -> step 1 ฝึกมือ");
  ok(await d.eval(`return document.querySelectorAll(".badge.got").length === 2 && JSON.parse(localStorage.getItem("mn_badges_seen")).includes("clip3");`), "the 'first clip' and '3 clips' badges are earned and celebrated once");
  ok(await d.eval(`return document.querySelectorAll(".stage").length === 5 && document.querySelector(".stage.now") && document.querySelectorAll(".stage .chip-link").length > 30;`), "the ladder lists 5 steps with their lessons");
  const layoutLad = await d.eval(LAYOUT_CHECK);
  ok(!layoutLad.length, "380px: the ladder fits the screen", layoutLad.join(" | "));
  await d.shot("ladder-380.png");
  await d.eval(`location.hash = "#/learn"; return true;`);
  ok(await d.until(`document.querySelector("main").innerText.includes("ตอนนี้ขั้น 1 ฝึกมือ")`, 8000), "the เรียน page starts with the ladder");
  await d.eval(`localStorage.clear(); return true;`);
  await d.close();

  // ---- honest time labels ----
  const t = await browser.newPage({ width: 380, height: 820 });
  await t.goto(BASE + "#/news", 2000);
  const head = await t.eval(`return document.querySelector(".page-head").innerText;`);
  ok(head.includes("ข้อมูล YouTube อ่านเมื่อ") && !head.includes("อัปเดตล่าสุด"), "news head says when YouTube was READ, not when the file was built", head.slice(0, 120));
  ok(await t.eval(`return document.querySelectorAll(".vcard .info").length > 0 && !document.querySelector(".vcard [title*='ประมาณ']");`), "video cards use tap labels, no hover-only tooltip");
  // pretend 40 hours have passed: a red "stale" banner must appear on the news page, the cover and Mr Idea
  for (const r of ["news", "", "idea"]) {
    await t.goto(BASE + "#/notes", 800);
    await t.eval(`const real = Date.now.bind(Date); Date.now = () => real() + 40 * 3600e3; location.hash = "#/${r}"; return true;`);
    ok(await t.until(`document.querySelector(".warn.bad") && document.querySelector(".warn.bad").textContent.includes("ข้อมูล YouTube ค้างตั้งแต่")`, 8000), `#/${r}: red banner when YouTube data is 40 h old`);
    if (r === "news") await t.shot("news-stale-380.png");
  }
  await t.close();

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
  ok(await p.eval(`return document.querySelector("main").innerText.includes("อ่านแล้ว 1/10");`), "cover shows chapter progress");

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

  // ---- install as an app + use without a connection ----
  console.log("4. install + offline");
  const a = await browser.newPage({ width: 380, height: 820 });
  await a.goto(BASE + "#/", 2500);
  ok(await a.until(`navigator.serviceWorker.controller`, 15000), "the app's service worker takes control");
  const inst = await a.cdp("Page.getInstallabilityErrors").catch((e) => ({ installabilityErrors: [{ errorId: e.message }] }));
  ok(!inst.installabilityErrors.length, "Edge says the site can be installed as an app", JSON.stringify(inst.installabilityErrors));
  const mf = await a.cdp("Page.getAppManifest");
  ok(!mf.errors?.length && /"short_name": "Mr News"/.test(mf.data), "manifest read without errors", JSON.stringify(mf.errors));
  ok(await a.eval(`return document.querySelector(".section img[src='icons/icon-192.png']") !== null;`), "cover shows the install card with the icon");
  await sleep(6000); // the worker saves the book's files
  server.down = true; // no signal
  for (const r of ["", "news", "handbook", "notes"]) {
    a.errors.length = 0;
    await a.goto(BASE + "#/" + r, 2500);
    const h1 = await a.eval(`return (document.querySelector("main h1") || {}).textContent || "";`);
    ok(h1.length > 0 && !(await a.eval(`return document.querySelector("main").innerText.includes("เปิดหน้านี้ไม่ได้");`)), `offline: #/${r} still opens`, h1);
  }
  ok(await a.eval(`return document.documentElement.dataset.offline === "1";`), "offline: the page knows the numbers are the saved copy");
  server.down = false;
  await a.close();
} finally {
  await browser.close();
  server.close();
}
console.log(`slowest page to open: ${(slowest / 1000).toFixed(1)} s`);
console.log(`\n${fail ? "❌" : "✅"} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
