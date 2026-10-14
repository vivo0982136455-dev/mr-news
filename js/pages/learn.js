// "เรียน" on the phone's bottom bar: the three lesson chapters with their progress.
import { h } from "../ui.js";
import { CHAPTERS, chapterProgress } from "../book.js";

export async function render(main) {
  main.append(h("div", { class: "page-head" }, h("h1", {}, "📚 บทเรียน"), h("p", {}, "อ่านทีละบท กด \"อ่านจบแล้ว\" ท้ายบท ระบบนับความคืบหน้าให้")));
  main.append(h("div", { class: "chapters" }, CHAPTERS.map((c) => {
    const p = chapterProgress(c.id);
    return h("a", { class: "chapter", href: "#/" + c.id },
      h("div", { class: "num" }, c.icon),
      h("div", {}, h("h3", {}, c.title), h("p", {}, c.sub),
        h("div", { class: "bar" }, h("i", { style: { width: `${(p.done / p.total) * 100}%` } })), h("div", { class: "note" }, `อ่านแล้ว ${p.done}/${p.total} บท`)));
  })));
}
