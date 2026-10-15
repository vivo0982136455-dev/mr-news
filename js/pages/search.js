// ค้นหาทั้งเล่ม: every lesson (title, goal and all its text) and the glossary, searched in this browser.
import { h, store, fill } from "../ui.js";
import { CHAPTERS } from "../book.js";
import { GLOSSARY } from "../content/glossary.js";
import { lessonHref } from "./ladder.js";

// all the readable text of a lesson block, as plain text (markup like **bold** removed)
const plain = (s) => String(s ?? "").replace(/\*\*|`|\[([^\]]+)\]\([^)]+\)/g, "$1");
function blockText(b) {
  const parts = [b.p, b.h, b.tip, b.bad, b.ai, b.warn, b.prompt, b.cap, ...(b.list || []), ...(b.steps || []), ...(b.check || []),
    ...(b.table ? [...b.table.head, ...b.table.rows.flat()] : [])];
  return parts.filter((x) => x != null).map(plain).join(" ");
}
// Thai has no spaces: match the query as written, ignoring case and extra spaces
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ");

export async function render(main, _page, arg) {
  const mods = await Promise.all(CHAPTERS.map((c) => c.load()));
  const index = mods.flatMap((m, ci) => m.LESSONS.map((l) => ({
    id: l.id, chapter: CHAPTERS[ci], title: l.title, text: norm([l.title, l.short, l.goal, ...l.blocks.map(blockText)].join(" ")), raw: [l.goal, ...l.blocks.map(blockText)].join(" "),
  })));
  const input = h("input", { type: "search", class: "search-box", placeholder: "พิมพ์คำที่อยากหา เช่น ไมค์ ภาษี Shorts ป้าย AI", "aria-label": "ค้นหาทั้งเล่ม", value: decodeURIComponent(arg || store.get("mn_search", "")) });
  const out = h("div");
  main.append(h("div", { class: "page-head" }, h("h1", {}, "🔎 ค้นหาทั้งเล่ม"), h("p", {}, "ค้นทุกบทเรียนและอภิธานศัพท์ — แตะผลลัพธ์เพื่อไปที่บทนั้น")), input, out);

  const snippet = (raw, q) => {
    const i = norm(raw).indexOf(q);
    if (i < 0) return h("span", {}, raw.slice(0, 90) + "…");
    const from = Math.max(0, i - 40);
    return h("span", {}, from ? "…" : "", raw.slice(from, i), h("mark", {}, raw.slice(i, i + q.length)), raw.slice(i + q.length, i + q.length + 60) + "…");
  };
  const draw = () => {
    const q = norm(input.value.trim());
    store.set("mn_search", input.value.trim());
    if (!q) return fill(out, glossary(GLOSSARY));
    const gl = GLOSSARY.filter((g) => norm(g.w + " " + g.d).includes(q));
    const hits = index.filter((l) => l.text.includes(q)).sort((a, b) => (norm(b.title).includes(q) ? 1 : 0) - (norm(a.title).includes(q) ? 1 : 0));
    fill(out,
      h("p", { class: "note" }, `พบ ${hits.length} บท และ ${gl.length} คำในอภิธานศัพท์`),
      h("div", { class: "hits" }, hits.slice(0, 30).map((l) => h("a", { class: "hit", href: lessonHref(l.id) },
        h("b", {}, `${l.chapter.icon} ${l.title}`), h("div", { class: "note" }, snippet(l.raw, q))))),
      gl.length ? glossary(gl) : null,
      !hits.length && !gl.length ? h("div", { class: "empty" }, "ไม่พบ — ลองคำที่สั้นลง หรือคำภาษาอังกฤษ เช่น Shorts, CapCut") : null);
  };
  input.addEventListener("input", draw);
  draw();
}

function glossary(list) {
  return h("section", { class: "section" }, h("h2", {}, "📖 อภิธานศัพท์ ", h("small", {}, `${list.length} คำ`)),
    h("dl", { class: "card gloss" }, list.map((g) => [h("dt", {}, g.w), h("dd", {}, g.d, " ", h("a", { href: g.href || lessonHref(g.lesson) }, "อ่านต่อ →"))])));
}
