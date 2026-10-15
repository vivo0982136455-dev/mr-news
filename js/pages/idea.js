// Mr Idea: today's best idea for each page, built from Mr News (themes that are big + rising) and the idea bank.
// Ends with a ready prompt for Gemini so Win can go deeper with his own life details.
import { h, num, pct, signedPct, dur, thDay, section, store, ytUrl, ytThumb, promptBox, mdEl, freshness } from "../ui.js";
import { getJSON } from "../data.js";
import { addNote } from "../notes-store.js";
import { MIX, IDEAS } from "../shared/ideabank.js";

// how many ready-written ideas the bank holds (the theme is chosen from real data, the idea text is not)
const BANK = Object.values(IDEAS).reduce((a, b) => a + (b.couple?.length || 0) + (b.ai?.length || 0), 0);

export async function render(main) {
  const data = await getJSON("data/ideas.json");
  const cards = data.cards || [];
  main.append(h("div", { class: "page-head" },
    h("h1", {}, "💡 Mr Idea"),
    freshness(data, { trends: false }),
    h("p", {}, `ระบบดูว่าหมวดไหน "ใหญ่" ในคลิปครีเอเตอร์ไทย${data.day ? " วันที่ " + thDay(data.day) : "วันนี้"} แล้วหยิบไอเดียของหมวดนั้นมาให้ 2 แบบ: 🧡 วันๆ One One (ชีวิตจริงคู่รัก) และ 💜 เพจ AI (ตัวละครประจำ) — หมวดเลือกจากข้อมูลจริง ส่วนตัวไอเดียหมุนจากคลัง ${BANK} ไอเดียที่เขียนไว้ล่วงหน้า`)));

  main.append(h("div", { class: "card" }, h("b", {}, "กฎ 3 ข้อ ก่อนใช้ไอเดีย"),
    h("ol", { style: { margin: "6px 0 0" } },
      h("li", {}, h("b", {}, "เก็บรูปแบบ เปลี่ยนมุมมอง"), " — ใช้ฟอร์แมตที่มาแรงได้ แต่เรื่อง ตัวละคร สถานที่ ต้องเป็นของเราเอง ห้ามลอกคลิปคนอื่น (YouTube และ Meta ตัดเงินงานที่ไม่เป็นต้นฉบับ)"),
      h("li", {}, h("b", {}, "ใส่ชีวิตจริง"), " — ไอเดียที่ดีที่สุดมาจากเรื่องจริงของ Win กับแฟน ไม่ใช่จาก AI ตัวที่แพงที่สุด"),
      h("li", {}, h("b", {}, "ปลอดภัยเสมอ"), " — ไม่มีคนจริง บริษัท แบรนด์ การเมือง ศาสนา สถาบันฯ ไม่ถ่ายในที่ทำงาน ไม่ให้เห็นบัตรหรือเอกสาร"))));

  if (!cards.length) {
    main.append(h("div", { class: "empty", style: { marginTop: "14px" } }, "วันนี้ข้อมูลยังไม่พอคิดไอเดีย (ต้องมีอย่างน้อย 3 คลิปต่อหมวด) ลองใหม่หลังรอบอัปเดตถัดไป"));
    return;
  }

  const [best, ...rest] = cards;
  main.append(section("⭐ ไอเดียเด็ดวันนี้", `จากหมวด ${best.icon} ${best.name}`, ideaCard(best, true)));
  if (data.mix) main.append(h("div", { class: "tip-box", style: { marginTop: "14px" } }, "🔀 ", MIX(data.mix[0].icon + " " + data.mix[0].name, data.mix[1].icon + " " + data.mix[1].name)));
  main.append(section("หมวดที่น่าทำวันนี้", "เรียงจาก ขนาด × กำลังขึ้น × เข้ากับเพจของ Win", h("div", { class: "grid", style: { gap: "14px" } }, rest.map((c) => ideaCard(c, false)))));

  // raw material
  main.append(section("วัตถุดิบเพิ่มเติม", "",
    h("div", { class: "grid g2" },
      h("div", { class: "card" }, h("h3", {}, "แฮชแท็กในคลิปที่วิวเยอะ"), h("div", { class: "row" }, (data.tags || []).map((t) => h("span", { class: "pill" }, t)))),
      h("div", { class: "card" }, h("h3", {}, "คนไทยค้นอะไรใน Google วันนี้"), h("div", { class: "row" }, (data.trends || []).map((t) => h("span", { class: "pill" }, t))),
        h("p", { class: "note", style: { marginTop: "6px" } }, "ส่วนใหญ่เป็นข่าว/กีฬา ใช้เป็นมุกเล็กๆ ได้ แต่อย่าทำคลิปเรื่องการเมือง ศาสนา หรือสถาบันฯ")))));

  main.append(geminiSection(cards));
}

function ideaCard(c, big) {
  const momentum = c.momentum == null ? h("span", { class: "pill" }, "เทียบขึ้น-ลงได้เมื่อครบ 7 วัน") : h("span", { class: "pill " + (c.momentum >= 0 ? "up" : "down") }, (c.momentum >= 0 ? "▲ " : "▼ ") + signedPct(c.momentum) + " จาก 7 วัน");
  const facts = h("div", { class: "row note", style: { margin: "4px 0 8px" } },
    h("span", { class: "pill brand" }, pct(c.share) + " ของวิว"), momentum,
    h("span", {}, `${c.count} คลิป · ${num(c.views)} วิว/24 ชม.`),
    c.medianSec ? h("span", {}, `ยาวกลางๆ ${dur(c.medianSec)} นาที`) : null,
    c.shortShare != null ? h("span", {}, `Shorts ${pct(c.shortShare)}`) : null);
  const side = (cls, label, idea, page) => idea ? h("div", { class: cls },
    h("h4", {}, label),
    h("div", { class: "idea-t" }, idea.t),
    h("div", { class: "hook" }, "🎬 2 วินาทีแรก: ", idea.hook),
    h("ol", {}, idea.plan.map((p) => h("li", {}, p))),
    h("div", { class: "why" }, "ทำไมคนดูจนจบ: ", idea.why),
    h("div", { class: "row", style: { marginTop: "8px" } }, h("button", { class: "btn small", onclick: () => addNote({ kind: "ไอเดีย", page, topic: idea.t, format: c.medianSec ? `ประมาณ ${dur(c.medianSec)} นาที` : "", source: `Mr Idea · ${c.name}`, why: idea.why, plan: idea.hook + "\n" + idea.plan.map((p, i) => `${i + 1}. ${p}`).join("\n") }) }, "📌 เก็บไอเดียนี้"))) : null;
  return h("div", { class: "idea", style: big ? { borderColor: "var(--brand)", borderWidth: "2px" } : {} },
    h("div", { class: "head" }, h("span", { class: "emoji" }, c.icon), h("div", {}, h("h3", { style: { margin: 0 } }, c.name), facts)),
    c.examples?.length ? h("details", { class: "more", open: big || undefined }, h("summary", {}, `หลักฐาน: คลิปจริงในหมวดนี้ (${c.examples.length})`),
      h("div", { class: "minis" }, c.examples.map((v) => h("a", { class: "mini", href: ytUrl(v.id), target: "_blank", rel: "noopener" },
        h("img", { src: ytThumb(v.id), alt: "", loading: "lazy", referrerpolicy: "no-referrer" }), h("b", {}, v.t), h("span", {}, `${v.cn} · +${num(v.g)}`))))) : null,
    c.tags?.length ? h("div", { class: "row", style: { marginTop: "6px" } }, c.tags.map((t) => h("span", { class: "tag" }, t))) : null,
    h("div", { class: "two" }, side("side-a", "🧡 วันๆ One One (คู่รักชีวิตจริง)", c.couple, "วันๆ One One"), side("side-b", "💜 เพจ AI (ตัวละครประจำ)", c.ai, "เพจ AI")));
}

// build a prompt for Gemini from a card + Win's page profile (kept in this browser)
function geminiSection(cards) {
  const profile = store.get("mn_profile", "");
  const pick = h("select", { class: "btn small", "aria-label": "เลือกหมวด" }, cards.map((c, i) => h("option", { value: i }, c.icon + " " + c.name)));
  const page = h("select", { class: "btn small", "aria-label": "เลือกเพจ" }, h("option", { value: "couple" }, "🧡 วันๆ One One"), h("option", { value: "ai" }, "💜 เพจ AI"));
  const prof = h("textarea", { rows: 6, placeholder: "ข้อมูลประจำเพจ (เขียนครั้งเดียว ระบบจำไว้ในเครื่องนี้): เราสองคนเป็นยังไง นิสัยตลกๆ เรื่องที่เถียงกันบ่อย คำติดปาก ความต่างไทย-ลาวที่เจอจริง ที่ที่ไปบ่อย…", style: { width: "100%" } }, profile);
  prof.addEventListener("input", () => { store.set("mn_profile", prof.value); make(); });
  const out = h("div");
  const make = () => {
    const c = cards[Number(pick.value)];
    const isAi = page.value === "ai";
    const ex = (c.examples || []).map((v, i) => `${i + 1}. "${v.t}" (+${num(v.g)} วิวใน 24 ชม.) ${ytUrl(v.id)}`).join("\n");
    const text = `ฉันเป็นครีเอเตอร์มือใหม่ในไทย คนดูเป็นคนไทยและคนลาว
${isAi ? "เพจของฉันเป็นเพจคลิป AI ที่มีตัวละครประจำ" : "เพจของฉันชื่อ \"วันๆ One One\" เป็นคลิปชีวิตจริงของฉันกับแฟน (ไทย-ลาว) ตลก ไม่ปรุงแต่ง ถ่ายด้วยมือถือ"}

ข้อมูลประจำเพจ:
${prof.value.trim() || "[ยังไม่ได้กรอก — เขียนนิสัย เรื่องที่เถียงกันบ่อย คำติดปาก ความต่างไทย-ลาว]"}

วันนี้หมวด "${c.name}" ได้ ${pct(c.share)} ของวิวคลิปครีเอเตอร์ไทย (${c.count} คลิป${c.momentum != null ? `, ${signedPct(c.momentum)} เทียบกับ 7 วันก่อน` : ""}) คลิปที่ติดอันดับยาวกลางๆ ${c.medianSec ? dur(c.medianSec) + " นาที" : "-"}
ตัวอย่างคลิปที่มาแรง (ดูลิงก์ได้):
${ex}

ช่วยคิดไอเดียคลิปสั้นแนวตั้ง${isAi ? "ของตัวละครประจำ ใช้ภาพนิ่ง 3-6 ภาพ + วิดีโอ AI แค่ 1-2 ช็อต" : " ที่ถ่ายได้จริงด้วยมือถือ ที่บ้านหรือตลาด ไม่เกิน 30 นาที"}
กติกา:
- เก็บ "รูปแบบ" และ "อารมณ์" ของคลิปเทรนด์ แต่เรื่องต้องมาจากข้อมูลประจำเพจของฉันเท่านั้น ห้ามลอกบทหรือมุก
- ห้ามมีคนจริง บริษัท แบรนด์ การเมือง ศาสนา สถาบันฯ ไม่ถ่ายในที่ทำงาน ไม่ให้เห็นบัตรหรือเอกสาร
ขั้นแรก: เขียน 5 ไอเดียที่ "ใครๆ ก็คิดได้" แล้วตัดทิ้ง
ขั้นสอง: ให้ไอเดียใหม่ 8 ข้อ แต่ละข้อมี ชื่อตอน / ประโยคแรก 2 วินาที / ตัวหนังสือบนจอ / มุกปิดท้าย / ทำไมคนไทยและคนลาวจะอิน
ขั้นสาม: บอกว่าข้อไหนทำเป็นซีรีส์ได้ดีที่สุด
ข้อไหนเดา ให้เขียน (เดา) กำกับ ห้ามแต่งตัวเลขที่ฉันไม่ได้ให้`;
    out.replaceChildren(promptBox(text));
  };
  pick.addEventListener("change", make);
  page.addEventListener("change", make);
  make();
  return section("🤝 คิดต่อกับ Gemini", "คัดลอก prompt นี้ไปวางใน Gemini (ฟรี) — Gemini เปิดดูลิงก์ YouTube ได้",
    h("div", { class: "card" },
      h("div", { class: "row", style: { marginBottom: "8px" } }, pick, page),
      h("div", { class: "form" }, h("label", { class: "wide" }, "ข้อมูลประจำเพจของ Win (กรอกครั้งเดียว เก็บในเครื่องนี้เท่านั้น)", prof)),
      h("div", { style: { marginTop: "10px" } }, out),
      h("div", { class: "row", style: { marginTop: "10px" } }, h("a", { class: "btn primary", href: "https://gemini.google.com/app", target: "_blank", rel: "noopener" }, "เปิด Gemini ↗")),
      mdEl("p", "AI ไม่เห็นเทรนด์ TikTok หรือ Facebook สดๆ — ถ้าเจอคลิปเด็ดใน TikTok ให้แคปหน้าจอ 2-3 ภาพแนบไปกับ prompt", { class: "note", style: { marginTop: "8px" } })));
}
