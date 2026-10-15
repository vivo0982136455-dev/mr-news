// แผนสัปดาห์นี้: up to 3 ideas (from Mr Idea, the notebook or typed in), each ticked ถ่ายแล้ว → ตัดแล้ว → โพสต์แล้ว.
// A streak counts weeks with every planned clip posted; a missed week uses one of 2 freezes - no blame, and a
// celebration the moment the week is done. Kept in this browser only.
import { h, toast, thDay, fill } from "../ui.js";
import { allNotes } from "../notes-store.js";
import { weekItems, addToPlan, setStep, removeFromPlan, weekDone, myStreak, thisWeek, STEPS, PLAN_MAX, FREEZES } from "../my-store.js";
import { addDays } from "../shared/patterns.js";

export async function render(main) {
  const box = h("div");
  main.append(h("div", { class: "page-head" },
    h("h1", {}, "🗓️ แผนสัปดาห์นี้"),
    h("p", {}, `เลือกไม่เกิน ${PLAN_MAX} ไอเดีย แล้วติ๊กทีละขั้น: ถ่ายแล้ว → ตัดแล้ว → โพสต์แล้ว แผนเล็กที่ทำเสร็จ ดีกว่าแผนใหญ่ที่ไม่ได้ทำ`)), box);
  const draw = () => fill(box, ...view(draw));
  draw();
}

function view(draw) {
  const week = thisWeek();
  const items = weekItems();
  const st = myStreak();
  const done = weekDone(items);
  const out = [];

  out.push(h("div", { class: "grid g3" },
    h("div", { class: "tile" }, h("div", { class: "label" }, "สัปดาห์นี้"), h("div", { class: "value" }, `${items.filter((x) => x.posted).length}/${items.length || PLAN_MAX}`), h("div", { class: "delta" }, `${thDay(week)} – ${thDay(addDays(week, 6))}`)),
    h("div", { class: "tile" }, h("div", { class: "label" }, "ทำครบต่อเนื่อง"), h("div", { class: "value" }, `${st.streak} สัปดาห์ 🔥`), h("div", { class: "delta" }, st.best > st.streak ? `ดีที่สุด ${st.best} สัปดาห์` : "นับสัปดาห์ที่โพสต์ครบทุกไอเดียในแผน")),
    h("div", { class: "tile" }, h("div", { class: "label" }, "ตัวช่วยสัปดาห์ที่พลาด"), h("div", { class: "value" }, "🧊".repeat(st.freezes) || "–"), h("div", { class: "delta" }, `เหลือ ${st.freezes}/${FREEZES} · ทำครบ 1 สัปดาห์ได้คืน 1`))));

  if (done) out.push(h("div", { class: "celebrate", role: "status" }, "🎉 สัปดาห์นี้โพสต์ครบทุกไอเดียแล้ว! เก่งมาก — วันอาทิตย์ลองดูผลคลิปและทบทวน 30 นาที ", h("a", { href: "#/results" }, "ไปหน้าผลคลิป →")));
  else if (st.frozen && !items.length) out.push(h("p", { class: "note" }, "สัปดาห์ที่แล้วพลาดไม่เป็นไร ตัวช่วย 🧊 รักษาความต่อเนื่องไว้ให้แล้ว เริ่มสัปดาห์นี้ใหม่ได้เลย"));

  out.push(h("div", { class: "section" }, h("h2", {}, "ไอเดียในแผน"),
    items.length ? h("div", { class: "plan-list" }, items.map((it) => planItem(it, draw)))
      : h("div", { class: "empty" }, "ยังไม่มีไอเดียในแผน — กด ➕ ใส่แผนสัปดาห์ ใน ", h("a", { href: "#/idea" }, "Mr Idea"), " หรือเลือกจากสมุดข้างล่าง")));

  if (items.length < PLAN_MAX) out.push(addSection(draw));
  out.push(h("p", { class: "note" }, "🔒 แผนเก็บในเครื่องนี้เท่านั้น สำรองพร้อมสมุดได้ที่หน้า \"สมุด\" → สำรองเป็นไฟล์"));
  return out;
}

function planItem(it, draw) {
  return h("div", { class: "card plan-item" + (it.posted ? " done" : "") },
    h("div", { class: "row", style: { justifyContent: "space-between", alignItems: "flex-start" } },
      h("div", { style: { minWidth: 0 } }, h("b", { class: "tt" }, it.t), h("div", { class: "note" }, [it.page, it.src].filter(Boolean).join(" · "))),
      h("button", { class: "btn small", type: "button", "aria-label": "ลบออกจากแผน: " + it.t, onclick: () => { removeFromPlan(it.id); draw(); } }, "ลบ")),
    h("div", { class: "steps-row", role: "group", "aria-label": "ขั้นตอนของ " + it.t },
      STEPS.map(([k, label]) => h("label", { class: "step" + (it[k] ? " on" : "") },
        h("input", { type: "checkbox", checked: !!it[k], onchange: (e) => {
          const before = weekDone(weekItems());
          setStep(it.id, k, e.target.checked);
          if (e.target.checked && k === "posted") toast("โพสต์แล้ว! 👏");
          if (!before && weekDone(weekItems())) toast("🎉 ครบทั้งสัปดาห์แล้ว!");
          draw();
        } }), label))));
}

// choose from the notebook's ideas, or type one
function addSection(draw) {
  const ideas = allNotes().filter((n) => n.kind === "ไอเดีย" || n.kind === "บท / มุก").slice(0, 12);
  const typed = h("input", { type: "text", maxlength: 200, placeholder: "พิมพ์ไอเดียเอง เช่น ทายราคาของในตลาด" });
  return h("div", { class: "section" }, h("h2", {}, "เพิ่มไอเดีย"),
    h("form", { class: "row", onsubmit: (e) => { e.preventDefault(); if (typed.value.trim() && addToPlan({ t: typed.value.trim(), src: "พิมพ์เอง" })) draw(); } },
      h("div", { class: "form", style: { flex: "1 1 220px" } }, h("label", {}, "ไอเดียของ Win", typed)),
      h("button", { class: "btn primary", type: "submit" }, "➕ ใส่แผน")),
    ideas.length ? h("div", { style: { marginTop: "10px" } }, h("div", { class: "note" }, "หรือเลือกจากสมุด:"),
      h("div", { class: "chips wrap" }, ideas.map((n) => h("button", { type: "button", onclick: () => { if (addToPlan({ t: n.topic, page: n.page, src: "สมุด" })) draw(); } }, "➕ " + n.topic))))
      : h("p", { class: "note" }, "ในสมุดยังไม่มีไอเดีย — กด 📌 เก็บไอเดียนี้ ใน Mr Idea แล้วจะเลือกได้จากตรงนี้"));
}
