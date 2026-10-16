// "ตรวจคำลาว" (#/lao): Win checks Steep's Lao draft line by line, group by group.
//  ✓ = right as it is; ✏️ = type the right Lao, saved at once and used by the book on this phone right away.
//  "ส่งให้ Steep" copies every correction (+ how many lines are checked) so Steep can put them in js/content/lao.js
//  for everyone. Kept in this phone: localStorage mn_lao_ok (checked lines) and mn_lao_fix (Thai -> Win's Lao).
// The Thai and Lao cells are written with textContent: h() would translate the Thai cell itself.
import { h, fill, store, toast, copy } from "../ui.js";
import { GROUPS } from "../content/lao.js";
import { reloadFixes } from "../lang.js";

const raw = (tag, attrs, text) => { const el = h(tag, attrs); el.textContent = text; return el; };

export async function render(main) {
  const fixes = store.get("mn_lao_fix", {});
  const ok = new Set(store.get("mn_lao_ok", []));
  const all = GROUPS.flatMap(([, g]) => Object.keys(g));
  const done = () => all.filter((k) => ok.has(k) || fixes[k]).length;
  const save = () => { store.set("mn_lao_fix", fixes); store.set("mn_lao_ok", [...ok]); reloadFixes(); progress(); };

  const bar = h("i"), count = h("b");
  const progress = () => {
    count.textContent = `${done()} / ${all.length}`;
    bar.style.width = `${(done() / all.length) * 100}%`;
    for (const [i, [, g]] of GROUPS.entries()) {
      const el = main.querySelector(`[data-group="${i}"]`);
      if (el) el.textContent = `${Object.keys(g).filter((k) => ok.has(k) || fixes[k]).length}/${Object.keys(g).length}`;
    }
  };
  const report = () => {
    const changed = all.filter((k) => fixes[k]);
    return [`คำลาวที่ Win แก้ (${changed.length} คำ) · ตรวจแล้ว ${done()} / ${all.length}`, ...changed.map((k) => `${k} => ${fixes[k]}`)].join("\n");
  };

  const row = (k, draft) => {
    const box = h("div", { class: "lao-row" });
    const draw = () => {
      const mine = fixes[k];
      box.className = "lao-row" + (mine ? " fixed" : ok.has(k) ? " ok" : "");
      fill(box, 
        raw("div", { class: "lao-th", lang: "th" }, k),
        raw("div", { class: "lao-lo", lang: "lo" }, mine || draft),
        mine ? raw("div", { class: "note", lang: "lo" }, "Steep: " + draft) : null,
        h("div", { class: "row" },
          h("button", { class: "btn small", type: "button", "aria-pressed": String(ok.has(k) && !mine), onclick: () => {
            delete fixes[k];
            ok.add(k);
            save();
            draw();
          } }, "✓ ถูกแล้ว"),
          h("button", { class: "btn small", type: "button", onclick: () => edit() }, "✏️ แก้"),
          mine ? h("button", { class: "btn small", type: "button", onclick: () => { delete fixes[k]; ok.delete(k); save(); draw(); } }, "↩️ ใช้คำของ Steep") : null));
    };
    const edit = () => {
      const input = h("input", { type: "text", lang: "lo", class: "lao-input", "aria-label": "คำลาวที่ถูก" });
      input.value = fixes[k] || draft;
      const keep = () => {
        const v = input.value.trim();
        if (!v) return toast("ใส่คำลาวก่อน");
        if (v === draft) delete fixes[k];
        else fixes[k] = v;
        ok.add(k);
        save();
        draw();
        toast("บันทึกแล้ว ✓");
      };
      fill(box, raw("div", { class: "lao-th", lang: "th" }, k), input,
        h("div", { class: "row" },
          h("button", { class: "btn small primary", type: "button", onclick: keep }, "บันทึก"),
          h("button", { class: "btn small", type: "button", onclick: draw }, "ยกเลิก")));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") keep(); });
      input.focus();
    };
    draw();
    return box;
  };

  main.append(
    h("div", { class: "page-head" },
      h("h1", {}, "🇱🇦 ตรวจคำลาว"),
      h("p", {}, "Steep ร่างคำลาวของเมนู ปุ่ม และหัวข้อไว้ Win อ่านทีละบรรทัด: ถูกแล้วกด ✓ ไม่ถูกกด ✏️ แล้วพิมพ์คำที่ถูก คำที่แก้จะขึ้นในสมุดเครื่องนี้ทันที เสร็จแล้วกด \"ส่งให้ Steep\" เพื่อให้ทุกเครื่องได้คำที่ถูก")),
    h("div", { class: "card" },
      h("div", {}, "ตรวจแล้ว ", count, " บรรทัด"),
      h("div", { class: "bar", style: { margin: "8px 0 12px" } }, bar),
      h("div", { class: "row" },
        h("button", { class: "btn primary", type: "button", onclick: () => copy(report()) }, "📋 ส่งให้ Steep (คัดลอก)"),
        h("a", { class: "btn", href: "#/start/lang" }, "เปลี่ยนภาษา")),
      h("p", { class: "note" }, "ชื่อปุ่มในเครื่องหมาย \" \" ที่มือถือแสดงเอง (เมนูของ iPhone / Chrome) ยังเป็นไทยหรืออังกฤษตามมือถือ เพราะมือถือไม่มีเมนูภาษาลาว")),
    ...GROUPS.map(([name, g], i) => h("details", { class: "fold section" },
      h("summary", {}, h("span", {}, raw("span", { lang: "lo" }, name), h("small", { "data-group": i }))),
      h("div", { class: "lao-list" }, Object.entries(g).map(([k, v]) => row(k, v))))));
  progress();
}
