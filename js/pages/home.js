// The cover: today's 3 numbers + today's idea, the chapters with progress, and the 10-minute daily routine.
import { h, num, pct, thTime, dur } from "../ui.js";
import { tryJSON } from "../data.js";
import { CHAPTERS, chapterProgress } from "../book.js";
import { THEME_BY_ID } from "../shared/themes.js";
import { allNotes } from "../notes-store.js";

export async function render(main) {
  const [latest, ideas] = await Promise.all([tryJSON("data/latest.json"), tryJSON("data/ideas.json")]);
  const hour = new Date().getHours();
  const hello = hour < 11 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  main.append(h("div", { class: "book-cover" },
    h("div", { class: "note" }, hello + " Win 👋"),
    h("h1", {}, "สมุดครีเอเตอร์ของ Win"),
    h("p", { style: { maxWidth: "62ch", color: "var(--ink-2)" } }, "หนังสือที่อัปเดตตัวเองทุกวัน: ดูว่าคนไทย-ลาวดูอะไร (Mr News) → คิดไอเดียของเราเอง (Mr Idea) → เรียนทำคลิปทั้งแบบคนจริงและ AI → จดทุกอย่างในสมุด"),
    h("div", { class: "row" }, h("a", { class: "btn primary", href: "#/news" }, "📰 เปิด Mr News วันนี้"), h("a", { class: "btn", href: "#/idea" }, "💡 ไอเดียวันนี้"))));

  if (latest) {
    const c = latest.creator;
    const t = c.themes[0];
    const card = ideas?.cards?.[0];
    main.append(h("div", { class: "section" },
      h("h2", {}, "วันนี้ในหนึ่งนาที ", h("small", {}, thTime(latest.updated))),
      h("div", { class: "grid g3" },
        h("a", { class: "tile", href: "#/news", style: { textDecoration: "none", color: "inherit" } },
          h("div", { class: "label" }, "คนไทยดูหมวดไหนมากที่สุด"), h("div", { class: "value" }, t ? `${THEME_BY_ID[t.id]?.icon || ""} ${THEME_BY_ID[t.id]?.name || t.id}` : "–"), h("div", { class: "delta" }, t ? `${pct(t.share)} ของวิวคลิปครีเอเตอร์` : "")),
        h("a", { class: "tile", href: "#/news", style: { textDecoration: "none", color: "inherit" } },
          h("div", { class: "label" }, "Shorts ได้วิวไปกี่ %"), h("div", { class: "value" }, pct(c.formats.short.v / (c.formats.short.v + c.formats.long.v || 1))), h("div", { class: "delta" }, `Top 50 ยาวกลางๆ ${dur(c.formats.medianTop50)} นาที`)),
        h("a", { class: "tile", href: "#/idea", style: { textDecoration: "none", color: "inherit" } },
          h("div", { class: "label" }, "ไอเดียเด็ดวันนี้ (วันๆ One One)"), h("div", { class: "value", style: { fontSize: "1.15rem" } }, card?.couple?.t || "–"), h("div", { class: "delta" }, card ? `จากหมวด ${card.icon} ${card.name}` : "")))));
  }

  main.append(h("div", { class: "section" }, h("h2", {}, "สารบัญ"),
    h("div", { class: "chapters" },
      chapterLink("news", "📰", "Mr News", "Top คลิปไทย-ลาวที่วิวเพิ่มมากที่สุดใน 24 ชม. หมวดที่มาแรง ช่องที่โต เทรนด์ Google รายวัน รายเดือน รายปี"),
      chapterLink("idea", "💡", "Mr Idea", "ไอเดียของวันจากข้อมูลจริง 2 แบบ (คู่รัก + AI) และ prompt พร้อมใช้กับ Gemini"),
      CHAPTERS.map((c) => {
        const p = chapterProgress(c.id);
        return chapterLink(c.id, c.icon, c.title, c.sub, p);
      }),
      chapterLink("notes", "📒", "สมุดโน้ตของ Win", `${allNotes().length} โน้ต · เก็บในเครื่องนี้เท่านั้น สำรองเป็นไฟล์ได้`))));

  main.append(h("div", { class: "section" }, h("h2", {}, "กิจวัตร 10 นาทีต่อวัน ", h("small", {}, "สำหรับคนทำงานกะ")),
    h("div", { class: "card" }, h("ol", { class: "steps" },
      h("li", {}, h("b", {}, "เปิด Mr News (3 นาที)"), "ดูหมวดอันดับ 1 และหมวดที่ขึ้นแรง กด 📌 จดคลิปที่ชอบ 2-3 คลิป"),
      h("li", {}, h("b", {}, "เปิด Mr Idea (3 นาที)"), "อ่านไอเดียเด็ดวันนี้ เลือก 1 ไอเดียที่ถ่ายได้จริงสัปดาห์นี้ กด 📌 เก็บ"),
      h("li", {}, h("b", {}, "เลื่อนดู Reels / Shorts / TikTok ด้วยเน็ตมือถือ (3 นาที)"), "ดูว่าคลิปไหนทำให้เราหยุดดู แล้วจดว่า \"ทำไม\" ลงสมุด"),
      h("li", {}, h("b", {}, "ถ่ายท่อนสั้นๆ ชีวิตจริง (1 นาที)"), "3-5 ท่อนต่อวัน แนวตั้ง นอกที่ทำงาน ไม่ให้เห็นบัตรหรือเอกสาร"))),
    h("p", { class: "note" }, "วันหยุด: เลือก 3 ไอเดียจากสมุด → เขียนบท → ถ่าย → ตัดต่อ → ให้ AI ตรวจ → โพสต์ (ดูบท \"ทำคลิปคนจริง\")")));
}

function chapterLink(id, icon, title, sub, p) {
  return h("a", { class: "chapter", href: "#/" + id },
    h("div", { class: "num" }, icon),
    h("div", {}, h("h3", {}, title), h("p", {}, sub),
      p ? h("div", {}, h("div", { class: "bar", "aria-label": `อ่านแล้ว ${p.done} จาก ${p.total} บท` }, h("i", { style: { width: `${(p.done / p.total) * 100}%` } })), h("div", { class: "note" }, `อ่านแล้ว ${p.done}/${p.total} บท`)) : null));
}
