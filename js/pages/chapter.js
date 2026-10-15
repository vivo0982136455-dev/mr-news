// Renders one chapter of the book (handbook / human / ai) from js/content/<id>.js.
// A lesson is a list of blocks: { p } { h } { list } { steps } { table } { tip } { bad } { ai } { figure } { prompt }
// { learn } (real YouTube lessons, chosen weekly by the robot) { widget } { check } { src }.
import { h, md, mdEl, promptBox, embed, store } from "../ui.js";
import { CHAPTERS, LESSON_IDS, readSet, setRead, chapterProgress } from "../book.js";
import { tryJSON } from "../data.js";
import { FIGURES } from "../content/figures.js";
import { WIDGETS } from "../content/widgets.js";

export async function render(main, chapterId) {
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  const [mod, learn] = await Promise.all([ch.load(), tryJSON("data/learn.json")]);
  const lessons = mod.LESSONS;
  const read = readSet();
  const prog = chapterProgress(chapterId);
  const bar = h("i", { style: { width: `${(prog.done / prog.total) * 100}%` } });
  const progText = h("span", {}, `อ่านแล้ว ${prog.done}/${prog.total} บท`);

  main.append(h("div", { class: "page-head" },
    h("div", { class: "kicker" }, "บทเรียน"),
    h("h1", {}, ch.icon + " " + ch.title),
    mdEl("p", mod.INTRO),
    h("div", { class: "bar", style: { maxWidth: "420px" } }, bar), h("div", { class: "note" }, progText)));

  const toc = h("nav", { class: "toc", "aria-label": "บทในหมวดนี้" }, lessons.map((l, i) => h("a", { href: `#/${chapterId}/${l.id}`, class: read.has(l.id) ? "done" : "", "data-l": l.id, onclick: (e) => { e.preventDefault(); document.getElementById(l.id)?.scrollIntoView({ behavior: "smooth" }); } }, `${i + 1}. ${l.short || l.title}`)));
  main.append(toc);

  const refresh = () => {
    const p = chapterProgress(chapterId);
    bar.style.width = `${(p.done / p.total) * 100}%`;
    progText.textContent = `อ่านแล้ว ${p.done}/${p.total} บท`;
    const s = readSet();
    for (const a of toc.querySelectorAll("a")) a.classList.toggle("done", s.has(a.getAttribute("data-l")));
  };

  lessons.forEach((l, i) => {
    const done = read.has(l.id);
    const btn = h("button", { class: "btn done-btn", type: "button", "aria-pressed": String(done) }, done ? "✓ อ่านจบแล้ว" : "อ่านจบแล้ว ✓");
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      setRead(l.id, on);
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "✓ อ่านจบแล้ว" : "อ่านจบแล้ว ✓";
      refresh();
    });
    const next = lessons[i + 1];
    main.append(h("article", { class: "lesson" + (chapterId === "ai" ? " ai" : ""), id: l.id },
      h("header", {}, h("div", { class: "n" }, i + 1), h("div", {}, h("h2", {}, l.title), l.goal ? h("div", { class: "goal" }, "เป้าหมาย: ", l.goal) : null)),
      ...l.blocks.map((b) => block(b, learn, l.id)),
      h("div", { class: "row", style: { justifyContent: "space-between", marginTop: "10px" } }, btn,
        next ? h("a", { class: "btn small", href: `#/${chapterId}/${next.id}`, onclick: (e) => { e.preventDefault(); document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth" }); } }, "บทถัดไป ↓") : null)));
  });

  const order = CHAPTERS.map((c) => c.id);
  const nextCh = CHAPTERS[order.indexOf(chapterId) + 1];
  main.append(h("div", { class: "card", style: { marginTop: "18px", textAlign: "center" } },
    h("p", {}, "จบหมวดนี้แล้ว 🎉"),
    nextCh ? h("a", { class: "btn primary", href: "#/" + nextCh.id }, `ไปต่อ: ${nextCh.icon} ${nextCh.title}`) : h("a", { class: "btn primary", href: "#/idea" }, "ไปเลือกไอเดียแรกใน Mr Idea 💡")));
  if (LESSON_IDS[chapterId].join() !== lessons.map((l) => l.id).join()) console.warn("lesson ids differ from book.js");
}

function block(b, learn, lessonId) {
  if (b.p) return mdEl("p", b.p);
  if (b.h) return h("h3", { style: { marginTop: "14px" } }, b.h);
  if (b.list) return h("ul", {}, b.list.map((x) => mdEl("li", x)));
  if (b.steps) return h("ol", { class: "steps" }, b.steps.map((x) => mdEl("li", x)));
  if (b.table) return h("div", { class: "table-wrap" }, h("table", { class: "data" },
    h("thead", {}, h("tr", {}, b.table.head.map((x) => h("th", {}, x)))),
    h("tbody", {}, b.table.rows.map((r) => h("tr", {}, r.map((c) => mdEl("td", String(c))))))));
  if (b.tip) return mdEl("div", b.tip, { class: "tip-box" });
  if (b.bad) return mdEl("div", b.bad, { class: "tip-box bad" });
  if (b.ai) return mdEl("div", b.ai, { class: "tip-box ai" });
  if (b.warn) return mdEl("div", b.warn, { class: "warn" });
  if (b.figure) return h("figure", { class: "figure" }, h("div", { html: FIGURES[b.figure] || "" }), b.cap ? h("figcaption", {}, b.cap) : null);
  if (b.prompt) return promptBox(b.prompt);
  if (b.widget) return WIDGETS[b.widget] ? WIDGETS[b.widget](b) : h("div", { class: "empty" }, "กำลังพัฒนา");
  if (b.check) return checklist(b.check, lessonId);
  if (b.src) return h("div", { class: "src" }, "ที่มา: ", b.src.map(([label, url], i) => [i ? " · " : "", h("a", { href: url, target: "_blank", rel: "noopener" }, label)]));
  if (b.learn) {
    const vids = learn?.lessons?.[b.learn]?.vids || [];
    const q = learn?.lessons?.[b.learn]?.q;
    return h("div", {}, h("h3", { style: { marginTop: "14px" } }, "🎥 เรียนจากคลิปจริง ", h("span", { class: "note", style: { fontWeight: 400 } }, "(ระบบค้นคลิปสอนภาษาไทยที่ตรงบทนี้ทุกสัปดาห์: ชื่อคลิปต้องมีคำว่า สอน/วิธี และเรื่องของบท ยาวไม่เกิน 30 นาที — กดเล่นได้เลย)")),
      vids.length ? h("div", { class: "embeds" }, vids.slice(0, b.n || 2).map(embed))
        : h("div", { class: "empty" }, "สัปดาห์นี้ยังไม่เจอคลิปที่ตรงบทพอ ",
          q ? h("a", { href: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, target: "_blank", rel: "noopener" }, "ค้นเองใน YouTube ↗") : null),
      vids.length > (b.n || 2) ? h("details", { class: "more" }, h("summary", {}, "ดูคลิปสอนเพิ่ม"), h("div", { class: "embeds" }, vids.slice(b.n || 2).map(embed))) : null);
  }
  return h("div");
}

// a checklist whose ticks are remembered in this browser
function checklist(items, lessonId) {
  const key = "mn_check_" + lessonId;
  const state = store.get(key, {});
  return h("ul", { style: { listStyle: "none", padding: 0 } }, items.map((t, i) => {
    const box = h("input", { type: "checkbox", checked: !!state[i], style: { width: "20px", height: "20px", flex: "none", marginTop: "3px" } });
    box.addEventListener("change", () => { const s = store.get(key, {}); s[i] = box.checked; store.set(key, s); });
    return h("li", {}, h("label", { style: { display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" } }, box, h("span", { html: md(t) })));
  }));
}
