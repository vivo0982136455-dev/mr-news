// One multiple-choice question (end of a lesson, or the review page). The options are shuffled the same way every
// time for the same question, so the right answer is not always first. Answering schedules the next review.
import { h } from "./ui.js";
import { answerQuiz, REVIEW_DAYS } from "./my-store.js";

function seeded(str) {
  let x = 2166136261;
  for (const ch of str) x = Math.imul(x ^ ch.codePointAt(0), 16777619) >>> 0;
  return () => ((x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0) / 4294967296);
}
export function order(qid, n) {
  const r = seeded(qid), idx = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}

export function questionCard(qid, item, { onDone } = {}) {
  const box = h("div", { class: "quiz-q", "data-qid": qid });
  const draw = (picked, after) => {
    box.replaceChildren(
      h("div", { class: "qq" }, item.q),
      h("div", { class: "opts", role: "group", "aria-label": item.q }, order(qid, item.a.length).map((i) => h("button", {
        type: "button", class: "opt" + (picked == null ? "" : i === 0 ? " right" : i === picked ? " wrong" : ""), disabled: picked != null,
        onclick: () => {
          const o = answerQuiz(qid, i === 0);
          draw(i, o);
          onDone && onDone(i === 0);
        },
      }, item.a[i]))),
      picked == null ? null : h("div", { class: "why " + (picked === 0 ? "ok" : "no"), role: "status" },
        picked === 0 ? "✅ ถูก! " : "❌ ยังไม่ใช่ — ", item.why,
        h("span", { class: "note" }, after.due ? ` · จะถามอีกครั้งใน ${REVIEW_DAYS[after.step - 1]} วัน` : " · จำได้แล้ว ไม่ถามอีก 🎉")));
  };
  draw(null);
  return box;
}
