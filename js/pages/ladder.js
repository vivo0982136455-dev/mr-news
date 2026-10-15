// บันได 5 ขั้น: the book's spine. Where Win is (counted in finished clips), what to do now, the lessons of each
// step, the badges, and the evidence behind the ladder.
import { h, mdEl, num, store, toast } from "../ui.js";
import { CHAPTERS, readSet } from "../book.js";
import { STAGES, stageOf, EVERY_STEP, EVIDENCE, EVIDENCE_SRC, BADGES } from "../content/ladder.js";
import { clipsDone, weeksDone, getReviews, remembered, dueQuestions } from "../my-store.js";

const CHAPTER_OF = { hb: "handbook", hu: "human", ai: "ai" };
export const lessonHref = (id) => `#/${CHAPTER_OF[id.slice(0, 2)]}/${id}`;

// what the badges are measured on - all from this device
export function badgeState() {
  return { clips: clipsDone(), weeksDone: weeksDone(), reviews: getReviews().length, quizDone: remembered(), subs: Number(store.get("mn_ypp_subs", 0)) || 0 };
}
// celebrate badges earned since the last look (once each)
export function newBadges() {
  const s = badgeState();
  const seen = new Set(store.get("mn_badges_seen", []));
  const fresh = BADGES.filter((b) => b.test(s) && !seen.has(b.id));
  if (fresh.length) {
    store.set("mn_badges_seen", [...seen, ...fresh.map((b) => b.id)]);
    toast(`🏅 ได้เหรียญใหม่: ${fresh.map((b) => b.icon + " " + b.name).join(", ")}`);
  }
  return fresh;
}

export async function render(main) {
  const mods = await Promise.all(CHAPTERS.map((c) => c.load()));
  const names = Object.fromEntries(mods.flatMap((m) => m.LESSONS.map((l) => [l.id, l.short || l.title])));
  const read = readSet();
  const clips = clipsDone();
  const cur = stageOf(clips);
  const next = STAGES[cur.n + 1];
  const st = badgeState();
  const due = dueQuestions().length;
  newBadges();

  main.append(h("div", { class: "page-head" },
    h("h1", {}, "🪜 บันได 5 ขั้น"),
    h("p", {}, "เส้นทางจากศูนย์ถึงมืออาชีพ ความคืบหน้านับจาก ", h("b", {}, "คลิปที่ทำเสร็จ"), " ไม่ใช่บทที่อ่าน — เพราะฝีมือมาจากการลงมือทำ และช่องเล็กได้ผู้ติดตามช้ามากในช่วงแรก")));

  // where Win is now
  const pct = next ? Math.min(1, clips / cur.to) : 1; // the same count as the label: "3 / 30 คลิป" = 10%
  main.append(h("div", { class: "card stage-now" },
    h("div", { class: "note" }, "ตอนนี้ Win อยู่"),
    h("h2", { style: { margin: "2px 0" } }, `ขั้น ${cur.n} · ${cur.name}`),
    h("div", { class: "bar", "aria-label": `คลิปที่ทำเสร็จ ${clips}` }, h("i", { style: { width: `${pct * 100}%` } })),
    h("div", { class: "note" }, next ? `คลิปที่ทำเสร็จ ${num(clips, { compact: false })} / ${cur.to} คลิป → ขั้น ${next.n} ${next.name}` : `คลิปที่ทำเสร็จ ${num(clips, { compact: false })} คลิป — ขั้นสุดท้ายแล้ว`),
    h("p", { class: "note", style: { margin: "6px 0 0" } }, "นับจากไอเดียที่ติ๊ก \"โพสต์แล้ว\" ในแผนสัปดาห์ หรือคลิปที่จดในหน้าผลคลิป (เอาตัวเลขที่มากกว่า ไม่บวกซ้ำ)"),
    h("div", { class: "do-now", style: { marginTop: "10px" } }, h("b", {}, "⚡ ทำเลย: "), cur.now),
    h("div", { class: "row", style: { marginTop: "10px" } },
      h("a", { class: "btn primary", href: "#/plan" }, "🗓️ แผนสัปดาห์"), h("a", { class: "btn", href: "#/results" }, "📈 จดผลคลิป"),
      due ? h("a", { class: "btn", href: "#/review" }, `🧠 ทวนความจำ ${due} ข้อ`) : null)));

  // badges
  main.append(h("div", { class: "section" }, h("h2", {}, "เหรียญตรา ", h("small", {}, `${BADGES.filter((b) => b.test(st)).length}/${BADGES.length} · ได้จากสิ่งที่ทำจริง`)),
    h("div", { class: "badges" }, BADGES.map((b) => {
      const got = b.test(st);
      return h("div", { class: "badge" + (got ? " got" : ""), title: b.how }, h("div", { class: "ico", "aria-hidden": "true" }, b.icon), h("b", {}, b.name), h("div", { class: "note" }, got ? "ได้แล้ว ✓" : b.how));
    }))));

  // the 5 steps
  main.append(h("div", { class: "section" }, h("h2", {}, "ทั้ง 5 ขั้น"),
    h("div", { class: "stages" }, STAGES.map((s) => {
      const state = s.n < cur.n ? "past" : s.n === cur.n ? "now" : "next";
      return h("details", { class: "card stage " + state, open: state === "now" || undefined },
        h("summary", {}, h("b", {}, `${state === "past" ? "✓ " : ""}ขั้น ${s.n} · ${s.name}`), h("span", { class: "note" }, ` ${s.when} · คลิปสะสม ${s.from} → ${isFinite(s.to) ? s.to : s.from + "+"}`)),
        h("div", { class: "stage-grid" },
          h("div", {}, h("div", { class: "lbl" }, "ทักษะหลัก"), h("ul", {}, s.skills.map((x) => h("li", {}, x)))),
          h("div", {}, h("div", { class: "lbl" }, "หลักไมล์"), h("p", {}, s.milestone), h("div", { class: "lbl" }, "ตัวเลขที่ดู"), h("p", {}, s.metric))),
        h("div", { class: "lbl" }, "บทที่ใช้ในขั้นนี้"),
        h("div", { class: "chips wrap" }, s.lessons.map((id) => h("a", { class: "chip-link" + (read.has(id) ? " done" : ""), href: lessonHref(id) }, (read.has(id) ? "✓ " : "") + (names[id] || id)))),
        h("div", { class: "do-now" }, h("b", {}, "⚡ ทำเลย: "), s.now));
    }))));

  main.append(h("div", { class: "section" }, h("h2", {}, "ทำทุกขั้น ทุกสัปดาห์"), h("div", { class: "card" }, h("ul", {}, EVERY_STEP.map((x) => h("li", {}, x))))));
  main.append(h("div", { class: "section" }, h("h2", {}, "บันไดนี้มาจากไหน ", h("small", {}, "[ข้อเสนอ] ที่ประกอบจากหลักฐาน")),
    h("div", { class: "card" }, EVIDENCE.map((x) => mdEl("p", x)),
      h("div", { class: "src" }, "ที่มา: ", EVIDENCE_SRC.map(([l, u], i) => [i ? " · " : "", h("a", { href: u, target: "_blank", rel: "noopener" }, l)])))));
}
