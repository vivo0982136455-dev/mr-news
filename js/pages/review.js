// ทวนความจำ: the end-of-lesson questions that are due again today (1, 3 and 7 days after answering).
import { h } from "../ui.js";
import { QUIZ } from "../content/quiz.js";
import { questionCard } from "../quiz-ui.js";
import { dueQuestions, remembered, getQuiz } from "../my-store.js";
import { lessonHref } from "./ladder.js";
import { CHAPTERS } from "../book.js";

export async function render(main) {
  const due = dueQuestions().map((qid) => {
    const [lesson, i] = qid.split("#");
    return { qid, lesson, item: QUIZ[lesson]?.q[Number(i)] };
  }).filter((x) => x.item);
  const answered = Object.keys(getQuiz()).length;
  const mods = await Promise.all(CHAPTERS.map((c) => c.load()));
  const names = Object.fromEntries(mods.flatMap((m) => m.LESSONS.map((l) => [l.id, l.short || l.title])));
  main.append(h("div", { class: "page-head" },
    h("h1", {}, "🧠 ทวนความจำ"),
    h("p", {}, "คำถามท้ายบทที่ถึงเวลาถามอีกครั้ง ตอบถูกจะเว้นนานขึ้น (1 → 3 → 7 วัน) ตอบผิดจะกลับมาถามพรุ่งนี้ — การทวนแบบเว้นระยะช่วยให้จำได้นานกว่าการอ่านซ้ำ")));
  main.append(h("div", { class: "grid g3" },
    h("div", { class: "tile" }, h("div", { class: "label" }, "ถึงเวลาทวนวันนี้"), h("div", { class: "value" }, String(due.length))),
    h("div", { class: "tile" }, h("div", { class: "label" }, "จำได้แล้ว (ผ่านครบ 7 วัน)"), h("div", { class: "value" }, String(remembered()))),
    h("div", { class: "tile" }, h("div", { class: "label" }, "เคยตอบทั้งหมด"), h("div", { class: "value" }, String(answered)))));
  if (!due.length) {
    main.append(h("div", { class: "empty", style: { marginTop: "14px" } }, answered
      ? "วันนี้ไม่มีคำถามให้ทวน เก่งมาก! ✓ — อ่านบทใหม่แล้วตอบคำถามท้ายบท"
      : "ยังไม่มีคำถาม — เปิดบทเรียน อ่านจบแล้วตอบคำถามท้ายบท ระบบจะเอากลับมาถามที่นี่ ",
      h("a", { href: "#/ladder" }, "ไปที่บันได 5 ขั้น →")));
    return;
  }
  main.append(h("div", { class: "section" }, due.map((d) => h("div", { class: "card", style: { marginBottom: "10px" } },
    h("div", { class: "note" }, "จากบท ", h("a", { href: lessonHref(d.lesson) }, names[d.lesson] || d.lesson)), questionCard(d.qid, d.item)))));
}
