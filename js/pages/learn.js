// "เรียน" on the phone's bottom bar: the ladder (where Win is, counted in finished clips), today's review,
// then the three lesson chapters.
import { h } from "../ui.js";
import { CHAPTERS, chapterProgress } from "../book.js";
import { clipsDone, dueQuestions } from "../my-store.js";
import { stageOf } from "../content/ladder.js";

export async function render(main) {
  main.append(h("div", { class: "page-head" }, h("h1", {}, "📚 บทเรียน"), h("p", {}, "เริ่มจากบันได 5 ขั้น: บอกว่าตอนนี้ควรอ่านบทไหน แล้วทุกบทจบด้วย \"ทำเลย\" และคำถาม 2-3 ข้อ")));
  const clips = clipsDone(), st = stageOf(clips), due = dueQuestions().length;
  main.append(h("div", { class: "chapters", style: { marginBottom: "14px" } },
    h("a", { class: "chapter", href: "#/ladder" }, h("div", { class: "num" }, "🪜"),
      h("div", {}, h("h3", {}, `บันได 5 ขั้น · ตอนนี้ขั้น ${st.n} ${st.name}`), h("p", {}, `คลิปที่ทำเสร็จ ${clips} คลิป · ดูว่าขั้นนี้ต้องฝึกอะไร และอ่านบทไหน`))),
    h("a", { class: "chapter", href: "#/review" }, h("div", { class: "num" }, "🧠"),
      h("div", {}, h("h3", {}, due ? `ทวนความจำ ${due} ข้อ` : "ทวนความจำ"), h("p", {}, due ? "ถึงเวลาทวนคำถามท้ายบท (2 นาที)" : "วันนี้ไม่มีคำถามค้าง ✓")))));
  main.append(h("div", { class: "chapters" }, CHAPTERS.map((c) => {
    const p = chapterProgress(c.id);
    return h("a", { class: "chapter", href: "#/" + c.id },
      h("div", { class: "num" }, c.icon),
      h("div", {}, h("h3", {}, c.title), h("p", {}, c.sub),
        h("div", { class: "bar" }, h("i", { style: { width: `${(p.done / p.total) * 100}%` } })), h("div", { class: "note" }, `อ่านแล้ว ${p.done}/${p.total} บท`)));
  })));
}
