// The cover: "เริ่มที่นี่" the first time, then "วันนี้" (3 clips that did far better than their channel's usual in
// Win's themes, 1 idea, 1 small task, this week's plan), today's 3 numbers, the chapters, the 10-minute routine.
import { h, pct, dur, thDay, freshness, info, EST_TEXT, videoCard, store, toast, fill } from "../ui.js";
import { tryJSON } from "../data.js";
import { CHAPTERS, chapterProgress } from "../book.js";
import { THEME_BY_ID, isShort } from "../shared/themes.js";
import { allNotes, noteFromVideo } from "../notes-store.js";
import { installState, askInstall, onInstallChange, isIOS } from "../pwa.js";
import { getSetup, weekItems, myStreak, addToPlan, todayDone, setTodayDone, STEPS, PLAN_MAX, clipsDone, dueQuestions } from "../my-store.js";
import { stageOf } from "../content/ladder.js";
import { newBadges } from "./ladder.js";
import { setupForm } from "./start.js";
import { backupNag, shareButton } from "../backup.js";

const redraw = () => window.dispatchEvent(new HashChangeEvent("hashchange"));

export async function render(main) {
  const [latest, ideas] = await Promise.all([tryJSON("data/latest.json"), tryJSON("data/ideas.json")]);
  const hour = new Date().getHours();
  const hello = hour < 11 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";

  main.append(h("div", { class: "book-cover" },
    h("div", { class: "note" }, hello + " Win 👋"),
    h("h1", {}, "สมุดครีเอเตอร์ของ Win"),
    h("p", { style: { maxWidth: "62ch", color: "var(--ink-2)" } }, "หนังสือที่อัปเดตตัวเองทุกวัน: ดูว่าคลิปไทย-ลาวแบบไหนกำลังได้วิว (Mr News) → คิดไอเดียของเราเอง (Mr Idea) → เรียนทำคลิปทั้งแบบคนจริงและ AI → จดทุกอย่างในสมุด"),
    h("div", { class: "row" }, h("a", { class: "btn primary", href: "#/news" }, "📰 เปิด Mr News วันนี้"), h("a", { class: "btn", href: "#/idea" }, "💡 ไอเดียวันนี้"))));

  newBadges(); // a badge earned elsewhere (plan, results, review) is celebrated here once
  const nag = backupNag(redraw);
  if (nag) main.append(nag);
  const setup = getSetup();
  if (!setup) main.append(h("div", { class: "section" }, h("h2", {}, "👋 เริ่มที่นี่ ", h("small", {}, "ครั้งแรกเท่านั้น · ข้ามได้ทุกข้อ")), setupForm(redraw)));
  else main.append(todayCard(setup, latest, ideas));

  if (latest) {
    const c = latest.creator;
    const t = c.themes[0];
    const card = ideas?.cards?.[0];
    const est = latest.counts?.th ? latest.measured / latest.counts.th < 0.5 : true;
    main.append(h("div", { class: "section" },
      h("h2", {}, "วันนี้ในหนึ่งนาที ", h("small", {}, "ข้อมูลวันที่ " + thDay(latest.day))),
      freshness(latest, { trends: false }),
      // the tiles are links, so the "ประมาณ" button sits above them (a button inside a link would open the link)
      est ? h("div", { class: "row note", style: { marginBottom: "8px" } }, info("การ์ดชุดนี้ส่วนใหญ่เป็นค่าประมาณ", EST_TEXT, "est")) : null,
      h("div", { class: "grid g3" },
        h("a", { class: "tile", href: "#/news", style: { textDecoration: "none", color: "inherit" } },
          h("div", { class: "label" }, "หมวดที่ได้วิวมากสุด (ในคลิปที่ระบบเจอ)"), h("div", { class: "value" }, t ? `${THEME_BY_ID[t.id]?.icon || ""} ${THEME_BY_ID[t.id]?.name || t.id}` : "–"), h("div", { class: "delta" }, t ? `${pct(t.share)} ของวิวคลิปครีเอเตอร์ต้นฉบับ` : "")),
        h("a", { class: "tile", href: "#/news", style: { textDecoration: "none", color: "inherit" } },
          h("div", { class: "label" }, "Shorts ได้วิวไปกี่ %"), h("div", { class: "value" }, pct(c.formats.short.v / (c.formats.short.v + c.formats.long.v || 1))), h("div", { class: "delta" }, `Top 50 ยาวกลางๆ ${dur(c.formats.medianTop50)} นาที`)),
        h("a", { class: "tile", href: "#/idea", style: { textDecoration: "none", color: "inherit" } },
          h("div", { class: "label" }, "ไอเดียเด็ดวันนี้ (วันๆ One One)"), h("div", { class: "value", style: { fontSize: "1.15rem" } }, card?.couple?.t || "–"), h("div", { class: "delta" }, card ? `จากหมวด ${card.icon} ${card.name}` : "")))));
  }

  main.append(installCard()); // below the day's content: it is useful once, the day's content every day

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

// "Install as an app": a real button where the browser offers it (Android Chrome / Edge / Samsung),
// otherwise the steps for the phone's own menu (iPhone Safari, or when the offer has not come yet).
function installCard() {
  const box = h("div", { class: "section" });
  const draw = () => {
    const st = installState();
    if (st === "app") return box.replaceChildren();
    if (st === "installed") return fill(box, h("div", { class: "tip-box" }, "✅ ติดตั้งแล้ว — เปิดได้จากไอคอน MN บนหน้าจอ"));
    const steps = isIOS()
      ? h("ol", { class: "note", style: { margin: "6px 0 0" } }, h("li", {}, "เปิดหน้านี้ใน Safari"), h("li", {}, "กดปุ่มแชร์ (สี่เหลี่ยมมีลูกศรชี้ขึ้น) ด้านล่าง"), h("li", {}, "เลือก \"เพิ่มไปยังหน้าจอโฮม\" → กด \"เพิ่ม\""))
      : h("ol", { class: "note", style: { margin: "6px 0 0" } }, h("li", {}, "เปิดหน้านี้ใน Chrome"), h("li", {}, "กดเมนู ⋮ มุมขวาบน"), h("li", {}, "เลือก \"ติดตั้งแอป\" (หรือ \"เพิ่มลงในหน้าจอหลัก\") → กด \"ติดตั้ง\""));
    fill(box, h("div", { class: "card", style: { display: "grid", gridTemplateColumns: "56px 1fr", gap: "12px", alignItems: "start" } },
      h("img", { src: "icons/icon-192.png", alt: "", width: 56, height: 56, style: { borderRadius: "12px" } }),
      h("div", {},
        h("b", {}, "📲 ติดตั้ง Mr News เป็นแอปบนมือถือ"),
        h("div", { class: "note" }, "มีไอคอน MN บนหน้าจอ เปิดเต็มจอ และเปิดอ่านได้แม้เน็ตไม่ดี (ฟรี ไม่ต้องผ่าน Play Store)"),
        st === "ready" ? h("div", { class: "row", style: { marginTop: "8px" } }, h("button", { class: "btn primary", type: "button", onclick: async () => { await askInstall(); draw(); } }, "ติดตั้งแอป")) : steps)));
  };
  const off = onInstallChange(() => (box.isConnected ? draw() : off()));
  draw();
  return box;
}

// ---------------------------------------------------------------- "วันนี้": what to look at and do today
const STEP_TASK = { shot: "ถ่าย 3-5 ท่อนสั้น แนวตั้ง", cut: "ตัดให้เหลือไม่เกิน 60 วินาที ใส่ซับ", posted: "โพสต์ แล้วกลับมาติ๊ก \"โพสต์แล้ว\"" };
const FREE_TASK = {
  3: "เปิด Mr Idea แล้วกด ➕ ใส่แผนสัปดาห์ 1 ไอเดีย",
  10: "ถ่ายท่อนสั้นชีวิตจริง 3 ท่อน (แนวตั้ง นอกที่ทำงาน ไม่ให้เห็นบัตรหรือเอกสาร)",
  30: "เปิดแม่แบบบทใน Mr Idea เขียนบท 1 เรื่อง แล้วถ่ายเลย",
};
export function smallTask(setup, items) {
  const next = items.find((x) => !x.posted);
  if (next) {
    const step = STEPS.map(([k]) => k).find((k) => !next[k]);
    return `ไอเดีย “${next.t}”: ${STEP_TASK[step]}`;
  }
  if (items.length && items.every((x) => x.posted)) return "แผนสัปดาห์นี้เสร็จแล้ว 🎉 — วันนี้ดูผลคลิปแล้วจดตัวเลขในหน้า \"ผลคลิปของเรา\"";
  return FREE_TASK[setup.minutes] || FREE_TASK[3];
}

function todayCard(setup, latest, ideas) {
  const items = weekItems();
  const st = myStreak();
  const themes = new Set(setup.themes || []);
  const fmtOk = (v) => !setup.format || setup.format === "both" || (setup.format === "short") === isShort(v);
  const flagged = store.get("mn_flagged", {});
  const pool = (latest?.creator?.outliers || []).filter((v) => !flagged[v.ch] && fmtOk(v));
  let clips = themes.size ? pool.filter((v) => v.themes.some((t) => themes.has(t))) : pool;
  if (clips.length < 3) clips = [...clips, ...pool.filter((v) => !clips.includes(v))];
  clips = clips.slice(0, 3);
  const cards = ideas?.cards || [];
  const card = cards.find((c) => themes.has(c.theme)) || cards[0];
  const idea = card?.couple;

  const done = h("input", { type: "checkbox", checked: todayDone(), onchange: (e) => { setTodayDone(e.target.checked); if (e.target.checked) toast("เยี่ยมมาก! วันนี้ทำแล้ว ✓"); } });
  return h("div", { class: "section today" },
    h("h2", {}, "วันนี้ของ Win ", h("small", {}, h("a", { href: "#/start" }, "ตั้งค่าหน้าแรก"))),
    setup.when || setup.what ? h("p", { class: "plan-line" }, `📌 หลังจาก${setup.when || "…"} ฉันจะ${setup.what || "…"}`) : null,
    h("label", { class: "card task" }, done, h("span", {}, h("b", {}, "งานเล็ก 1 อย่าง: "), smallTask(setup, items))),
    (() => { const clips = clipsDone(), s = stageOf(clips), due = dueQuestions().length;
      return h("a", { class: "card plan-mini", href: "#/ladder" }, h("b", {}, `🪜 บันได: ขั้น ${s.n} ${s.name}`), ` · ทำเสร็จ ${clips} คลิป`, due ? ` · 🧠 ทวน ${due} ข้อ` : "", " →"); })(),
    h("a", { class: "card plan-mini", href: "#/plan" },
      h("b", {}, "🗓️ แผนสัปดาห์นี้: "),
      items.length ? `${items.filter((x) => x.posted).length}/${items.length} โพสต์แล้ว` : `ยังว่าง — เลือก ${PLAN_MAX} ไอเดียจาก Mr Idea`,
      st.streak ? ` · ทำครบต่อเนื่อง ${st.streak} สัปดาห์ 🔥` : "", " →"),
    idea ? h("div", { class: "card" },
      h("div", { class: "note" }, `💡 ไอเดียของวันนี้ · หมวด ${card.icon} ${card.name}`),
      h("div", { class: "idea-t" }, idea.t), h("div", { class: "hook" }, "🎬 2 วินาทีแรก: ", idea.hook),
      h("div", { class: "row", style: { marginTop: "8px" } },
        h("button", { class: "btn small", type: "button", onclick: () => { if (addToPlan({ t: idea.t, page: "วันๆ One One", src: `Mr Idea · ${card.name}` })) redraw(); } }, "➕ ใส่แผนสัปดาห์"),
        h("a", { class: "btn small", href: "#/idea" }, "ดูไอเดียทั้งหมด"),
        shareButton(() => `💡 ไอเดียคลิปวันนี้: ${idea.t}\n🎬 ${idea.hook}`))) : null,
    clips.length ? h("div", {},
      h("h3", {}, "3 คลิปที่ได้วิวเกินปกติของช่องตัวเอง ", h("small", { class: "note" }, themes.size ? "ในหมวดที่ Win เลือก" : "ทุกหมวด")),
      h("div", { class: "vlist" }, clips.map((v, i) => videoCard(v, i + 1, { onSave: (x) => noteFromVideo(x), why: true, showGain: false })))) : null);
}

function chapterLink(id, icon, title, sub, p) {
  return h("a", { class: "chapter", href: "#/" + id },
    h("div", { class: "num" }, icon),
    h("div", {}, h("h3", {}, title), h("p", {}, sub),
      p ? h("div", {}, h("div", { class: "bar", "aria-label": `อ่านแล้ว ${p.done} จาก ${p.total} บท` }, h("i", { style: { width: `${(p.done / p.total) * 100}%` } })), h("div", { class: "note" }, `อ่านแล้ว ${p.done}/${p.total} บท`)) : null));
}
