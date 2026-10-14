// Mr News: what Thai (and Lao) people watch - today, this month, this year. Data: data/latest.json + the history files.
import { h, num, pct, signedPct, dur, thTime, thDay, thMonth, seg, tile, section, videoCard, store } from "../ui.js";
import { hbars, stack, columns, lines, SERIES } from "../charts.js";
import { getJSON, tryJSON } from "../data.js";
import { THEME_BY_ID, CATEGORY, isCreatorVideo, MEDIA_CHANNEL } from "../shared/themes.js";
import { noteFromVideo } from "../notes-store.js";

const rowToVideo = (r) => ({ id: r[0], g: r[1], t: r[2], cn: r[3], cat: r[4], d: r[5], themes: (r[6] || "").split(" ").filter(Boolean), m: r[7] });
const save = (v) => noteFromVideo(v);

export async function render(main) {
  const [latest, index] = await Promise.all([getJSON("data/latest.json"), tryJSON("data/index.json")]);
  const st = { period: store.get("mn_news_period", "day"), view: store.get("mn_news_view", "creator"), theme: null, day: "latest" };

  main.append(
    h("div", { class: "page-head" },
      h("div", { class: "kicker" }, "อัปเดตล่าสุด ", thTime(latest.updated)),
      h("h1", {}, "📰 Mr News"),
      h("p", {}, "คนไทยและคนลาวกำลังดูอะไรบน YouTube: ระบบค้นคลิปไทย/ลาวทุกวัน วัดยอดวิวที่เพิ่มขึ้นใน 24 ชั่วโมง แล้วจัดอันดับให้ หมวด \"ครีเอเตอร์\" ตัดเพลง ข่าว หนัง และช่องทีวีออก เพราะ Win เป็นครีเอเตอร์ ไม่ใช่นักร้องหรือนักข่าว")));

  const controls = h("div", { class: "controls" });
  const body = h("div");
  main.append(controls, body);

  const draw = async () => {
    controls.replaceChildren(
      seg([["day", "วันนี้"], ["month", "รายเดือน"], ["year", "รายปี"]], st.period, (v) => { st.period = v; store.set("mn_news_period", v); draw(); }, "ช่วงเวลา"),
      seg([["creator", "ครีเอเตอร์"], ["all", "ทั้งหมด"], ["lao", "ลาว"]], st.view, (v) => { st.view = v; st.theme = null; store.set("mn_news_view", v); draw(); }, "มุมมอง"));
    body.replaceChildren(h("div", { class: "loading" }, "กำลังโหลด…"));
    try {
      if (st.view === "lao") body.replaceChildren(...laoView(latest));
      else if (st.period === "day") body.replaceChildren(...await dayView(latest, index, st, draw));
      else body.replaceChildren(...await periodView(st.period, index, st));
    } catch (e) {
      body.replaceChildren(h("div", { class: "card" }, "โหลดข้อมูลช่วงนี้ไม่ได้: ", String(e.message)));
    }
  };
  await draw();
  main.append(linksSection());
}

// ---------------------------------------------------------------- today
async function dayView(latest, index, st, redraw) {
  const out = [];
  // history day picker (filter sits above what it drives)
  const days = (index?.days || []).slice().reverse();
  if (days.length > 1) {
    const sel = h("select", { class: "btn small", "aria-label": "เลือกวัน", onchange: (e) => { st.day = e.target.value; redraw(); } },
      h("option", { value: "latest" }, "ล่าสุด (" + thDay(latest.day) + ")"),
      days.filter((d) => d !== latest.day).map((d) => h("option", { value: d, selected: st.day === d }, thDay(d))));
    out.push(h("div", { class: "row", style: { marginBottom: "10px" } }, h("span", { class: "note" }, "ดูวันย้อนหลัง:"), sel));
  }
  if (st.day !== "latest") return [...out, ...(await pastDay(st.day, st))];

  const v = st.view === "all" ? latest.all : latest.creator;
  const top = v.top;
  const themeOf = (id) => THEME_BY_ID[id] || { name: id, icon: "" };
  const best = v.themes[0];
  const rising = v.themes.filter((t) => t.prev != null && t.n >= 5).map((t) => ({ ...t, mom: t.share / t.prev - 1 })).sort((a, b) => b.mom - a.mom)[0];
  const measured = latest.measured;

  out.push(h("div", { class: "grid g4" },
    tile("วิวรวมใน 24 ชม.", num(v.total), `${num(st.view === "all" ? latest.counts.th : latest.counts.creator)} คลิปไทยที่ติดตาม`),
    tile("Shorts ได้วิว", pct(v.formats.short.v / (v.formats.short.v + v.formats.long.v || 1)), `${v.formats.short.n} คลิป Shorts / ${v.formats.long.n} คลิปยาว`),
    tile("ความยาวกลางของ Top 50", dur(v.formats.medianTop50), "นาที:วินาที"),
    tile("หมวดอันดับ 1", best ? themeOf(best.id).icon + " " + pct(best.share) : "–", best ? themeOf(best.id).name : "")));

  if (best) out.push(h("div", { class: "hero", style: { marginTop: "14px" } },
    h("div", { class: "note" }, "สรุปวันนี้"),
    h("div", { class: "big" }, `คนไทยดู “${themeOf(best.id).name}” มากที่สุด — ${pct(best.share)} ของวิวทั้งหมด`),
    h("p", { style: { margin: 0 } }, rising && rising.mom > 0.05
      ? `หมวดที่ขึ้นแรงที่สุดเมื่อเทียบกับ 7 วันก่อน: ${themeOf(rising.id).icon} ${themeOf(rising.id).name} (${signedPct(rising.mom)})`
      : "การเทียบว่าหมวดไหน \"ขึ้น\" หรือ \"ลง\" จะเริ่มแสดงเมื่อระบบเก็บข้อมูลได้มากกว่า 1 วัน"),
    measured < 50 ? h("p", { class: "note", style: { margin: "6px 0 0" } }, "ข้อควรรู้: วันนี้วิว 24 ชม. ส่วนใหญ่เป็นค่า “ประมาณ” จากอายุคลิป ระบบจะวัดซ้ำและได้ค่าจริงตั้งแต่รอบถัดไป (ประมาณ 24 ชม. หลังเจอคลิปครั้งแรก)") : null));

  // themes
  out.push(section("หมวดไหนได้วิวมากที่สุด", "% ของวิว 24 ชม. (คลิปหนึ่งอยู่ได้หลายหมวด)",
    h("div", { class: "card" }, hbars(v.themes.slice(0, 14).map((t) => ({
      label: themeOf(t.id).icon + " " + themeOf(t.id).name,
      value: t.share,
      display: pct(t.share),
      note: t.prev != null ? signedPct(t.share / t.prev - 1) + " จาก 7 วัน" : `${t.n} คลิป`,
      tip: `${themeOf(t.id).name}\n${num(t.v)} วิว จาก ${t.n} คลิป\n${pct(t.share, 1)} ของวิวทั้งหมด`,
    })), { head: ["หมวด", "% ของวิว"], color: "var(--s1)" }))));

  // format + posting hour
  const fmt = v.formats;
  out.push(h("div", { class: "grid g2", style: { marginTop: "14px" } },
    h("div", { class: "card" }, h("h3", {}, "Shorts หรือคลิปยาว?"), h("p", { class: "sub" }, "วิว 24 ชม. แยกตามความยาว (Shorts = ไม่เกิน 3 นาที)"),
      stack([{ label: "Shorts", value: fmt.short.v }, { label: "คลิปยาว", value: fmt.long.v }], { head: ["แบบ", "วิว", "สัดส่วน"] }),
      h("p", { class: "note" }, `คลิปที่ติด Top 50 ยาวกลางๆ ${dur(fmt.medianTop50)} นาที`)),
    h("div", { class: "card" }, h("h3", {}, "คลิปดังโพสต์กี่โมง"), h("p", { class: "sub" }, "จำนวนคลิปใน Top 100 ตามชั่วโมงที่โพสต์ (เวลาไทย)"),
      columns(v.hours.map((x) => ({ label: String(x.h), value: x.n, tip: `${String(x.h).padStart(2, "0")}:00-${String(x.h).padStart(2, "0")}:59 น.\n${x.n} คลิป · ${num(x.v)} วิว` })), { every: 3, head: ["ชั่วโมง", "จำนวนคลิป"], format: (x) => num(x) }))));

  // YouTube categories
  out.push(section("หมวดของ YouTube", "เจ้าของคลิปเลือกเองตอนอัปโหลด",
    h("div", { class: "card" }, hbars(v.cats.slice(0, 10).map((c) => ({ label: CATEGORY[c.id] || "หมวด " + c.id, value: c.share, display: pct(c.share), tip: `${CATEGORY[c.id] || c.id}\n${num(c.v)} วิว · ${c.n} คลิป` })), { head: ["หมวด YouTube", "% ของวิว"], color: "var(--s3)" }))));

  // the top list with a theme filter above it
  out.push(topList(`Top ${top.length} คลิป วิวเพิ่มมากที่สุดใน 24 ชม.`, top, st));

  // fresh
  const fresh = (latest.fresh || []).filter((x) => st.view === "all" || isCreatorVideo(x)).slice(0, 12);
  if (fresh.length) out.push(section("คลิปใหม่ที่แรงที่สุด", "โพสต์ไม่ถึง 24 ชม.", h("div", { class: "vlist" }, fresh.map((x, i) => videoCard(x, i + 1, { onSave: save })))));

  // hashtags
  if (v.tags?.length) out.push(section("แฮชแท็กที่อยู่ในคลิปที่วิวเยอะ", "นับวิว 24 ชม. ของคลิปที่ใส่แท็กนั้น",
    h("div", { class: "card" }, h("div", { class: "row" }, v.tags.slice(0, 20).map((t) => h("span", { class: "pill", title: `${t.n} คลิป` }, `${t.k} · ${num(t.v)}`))))));

  // channels
  out.push(channelsSection(latest));

  // Google Trends
  out.push(trendsSection(latest));

  // YouTube's own chart
  const ch = latest.charts?.TH || [];
  if (ch.length) out.push(section("ชาร์ตของ YouTube เอง (ไทย)", "เพลง เกม และตัวอย่างหนังที่มาแรง",
    h("div", { class: "card" }, h("p", { class: "note" }, "ตั้งแต่ 21 ก.ค. 2025 รายการ \"ยอดนิยม\" ของ YouTube มีแค่ เพลง หนัง และเกม จึงแยกไว้ตรงนี้ ใช้หาเพลงหรือกระแสเกม ไม่ใช่หัวข้อคลิปครีเอเตอร์"),
      h("details", { class: "more" }, h("summary", {}, `ดูทั้งหมด ${ch.length} คลิป`), h("div", { class: "vlist", style: { marginTop: "8px" } }, ch.map((x, i) => videoCard(x, i + 1, { showGain: false, onSave: save })))))));

  // history of themes
  out.push(await historySection(index));
  return out;
}

function topList(title, list, st) {
  const themeIds = [...new Set(list.flatMap((v) => v.themes))].filter((id) => THEME_BY_ID[id]);
  const counts = Object.fromEntries(themeIds.map((id) => [id, list.filter((v) => v.themes.includes(id)).length]));
  themeIds.sort((a, b) => counts[b] - counts[a]);
  const listBox = h("div", { class: "vlist" });
  let shown = 20;
  const more = h("button", { class: "btn", type: "button" }, "ดูเพิ่ม");
  const fill = () => {
    const f = st.theme ? list.filter((v) => v.themes.includes(st.theme)) : list;
    listBox.replaceChildren(...f.slice(0, shown).map((v, i) => videoCard(v, i + 1, { onSave: save })));
    more.hidden = f.length <= shown;
    if (!f.length) listBox.append(h("div", { class: "empty" }, "ไม่มีคลิปในหมวดนี้"));
  };
  more.addEventListener("click", () => { shown += 20; fill(); });
  const chips = h("div", { class: "chips", role: "group", "aria-label": "กรองตามหมวด" },
    h("button", { type: "button", "aria-pressed": String(!st.theme), onclick: (e) => pick(null, e) }, "ทุกหมวด"),
    themeIds.map((id) => h("button", { type: "button", "aria-pressed": String(st.theme === id), onclick: (e) => pick(id, e) }, `${THEME_BY_ID[id].icon} ${THEME_BY_ID[id].name} (${counts[id]})`)));
  function pick(id, e) {
    st.theme = id;
    shown = 20;
    for (const b of chips.children) b.setAttribute("aria-pressed", "false");
    e.currentTarget.setAttribute("aria-pressed", "true");
    fill();
  }
  fill();
  return section(title, "กด 📌 เพื่อจดคลิปที่น่าสนใจลงสมุด", chips, listBox, h("div", { class: "row", style: { justifyContent: "center", marginTop: "10px" } }, more));
}

function channelsSection(latest) {
  const rising = latest.channels.rising.slice(0, 12);
  let hideMedia = true;
  const tableBox = h("div");
  const fillTable = () => {
    const rows = latest.channels.bySubs.filter((c) => !hideMedia || !MEDIA_CHANNEL.test(c.t)).slice(0, 100);
    tableBox.replaceChildren(h("div", { class: "table-wrap" }, h("table", { class: "data" },
      h("thead", {}, h("tr", {}, h("th", {}, "#"), h("th", {}, "ช่อง"), h("th", { class: "num" }, "ผู้ติดตาม"), h("th", { class: "num" }, "+ผู้ติดตาม/วัน"), h("th", { class: "num" }, "คลิป"))),
      h("tbody", {}, rows.map((c, i) => h("tr", {}, h("td", {}, i + 1),
        h("td", {}, h("a", { href: c.h ? `https://www.youtube.com/${c.h}` : `https://www.youtube.com/channel/${c.id}`, target: "_blank", rel: "noopener" }, c.t)),
        h("td", { class: "num" }, num(c.subs)), h("td", { class: "num" }, c.subsGain == null ? "รอวัดพรุ่งนี้" : (c.subsGain >= 0 ? "+" : "") + num(c.subsGain, { compact: false })), h("td", { class: "num" }, num(c.vids, { compact: false }))))))));
  };
  const toggle = h("label", { class: "row note" }, h("input", { type: "checkbox", checked: true, onchange: (e) => { hideMedia = e.target.checked; fillTable(); } }), "ซ่อนช่องทีวี ข่าว ค่ายเพลง");
  fillTable();
  return section("ช่องไทย", "จากช่องที่ระบบเจอ (ยิ่งเก็บนาน ยิ่งครบ)",
    h("div", { class: "grid g2" },
      h("div", { class: "card" }, h("h3", {}, "ช่องที่วิวมาแรงวันนี้"), h("p", { class: "sub" }, "วิว 24 ชม. รวมทุกคลิปของช่องที่ระบบติดตาม"),
        rising.length ? hbars(rising.map((c) => ({ label: c.t, value: c.g, tip: `${c.t}\n${num(c.g)} วิวใน 24 ชม.\n${num(c.subs)} ผู้ติดตาม` })), { head: ["ช่อง", "วิว 24 ชม."], color: "var(--s2)" }) : h("div", { class: "empty" }, "ยังไม่มีข้อมูล")),
      h("div", { class: "card" }, h("h3", {}, "Top 100 ช่องไทยตามผู้ติดตาม"), toggle, tableBox)));
}

function trendsSection(latest) {
  const list = (items) => h("ol", { style: { paddingLeft: "1.4em", margin: 0 } }, items.slice(0, 20).map((t) => h("li", {},
    h("a", { href: `https://www.google.com/search?q=${encodeURIComponent(t.q)}`, target: "_blank", rel: "noopener" }, t.q), " ",
    h("span", { class: "pill" }, num(t.n) + "+ ค้นหา"),
    t.news?.[0] ? h("div", { class: "note" }, t.news[0]) : null)));
  const today = latest.trends?.today || [];
  const yest = latest.trends?.yesterday || [];
  return section("Google Trends ไทย", "คนไทยค้นอะไรใน Google (ข่าว กีฬา ดารา) — ไม่ใช่คลิป",
    h("div", { class: "grid g2" },
      h("div", { class: "card" }, h("h3", {}, "วันนี้"), today.length ? list(today) : h("div", { class: "empty" }, "ยังไม่มี")),
      h("div", { class: "card" }, h("h3", {}, "เมื่อวาน"), yest.length ? list(yest) : h("div", { class: "empty" }, "ระบบเริ่มเก็บวันนี้ พรุ่งนี้จะมีของเมื่อวาน"))),
    h("p", { class: "src" }, "ที่มา: Google Trends RSS ประเทศไทย (อ่านทุก 6 ชั่วโมง ครั้งละ 10 เรื่อง) · ลาวไม่มี: Google ไม่เปิดข้อมูลของลาว"));
}

async function historySection(index) {
  const days = index?.days || [];
  if (days.length < 2) return section("หมวดขึ้น-ลงแต่ละวัน", "",
    h("div", { class: "card" }, h("div", { class: "empty" }, `ระบบเริ่มเก็บประวัติวันที่ ${days[0] ? thDay(days[0]) : "วันนี้"} — กราฟเส้นจะขึ้นเมื่อมีข้อมูล 2 วันขึ้นไป`)));
  const recs = (await Promise.all(days.slice(-30).map((d) => tryJSON(`data/days/${d}.json`)))).filter(Boolean);
  const last = recs[recs.length - 1];
  const ids = last.creator.themes.slice(0, 4).map((t) => t.id);
  const series = ids.map((id, i) => ({
    label: THEME_BY_ID[id]?.name || id, color: SERIES[i],
    points: recs.map((r) => ({ x: r.day, y: (r.creator.themes.find((t) => t.id === id) || { share: 0 }).share })),
  }));
  return section("หมวดขึ้น-ลงแต่ละวัน", `${recs.length} วันล่าสุด · 4 หมวดใหญ่ของวันนี้`,
    h("div", { class: "card" }, lines(series, { format: (v) => pct(v), xLabel: (x) => thDay(x).split(" ").slice(0, 2).join(" ") })));
}

async function pastDay(day, st) {
  const rec = await getJSON(`data/days/${day}.json`);
  const top = rec.creator.top.map(rowToVideo);
  return [
    h("div", { class: "card" }, h("h3", {}, `หมวดของวันที่ ${thDay(day)}`),
      hbars(rec.creator.themes.slice(0, 12).map((t) => ({ label: (THEME_BY_ID[t.id]?.icon || "") + " " + (THEME_BY_ID[t.id]?.name || t.id), value: t.share, display: pct(t.share) })), { head: ["หมวด", "% ของวิว"] })),
    topList(`Top คลิปของวันที่ ${thDay(day)} (ครีเอเตอร์)`, top.slice(0, 100), st),
  ];
}

// ---------------------------------------------------------------- month / year
async function periodView(period, index, st) {
  const list = (period === "month" ? index?.months : index?.years) || [];
  if (!list.length) return [h("div", { class: "empty" }, "ยังไม่มีข้อมูล")];
  const key = st[period] && list.includes(st[period]) ? st[period] : list[list.length - 1];
  const rec = await getJSON(`data/${period === "month" ? "months" : "years"}/${key}.json`);
  const name = period === "month" ? thMonth(key) : "ปี " + (Number(key) + 543);
  const pick = list.length > 1 ? h("select", { class: "btn small", "aria-label": "เลือกช่วง", onchange: async (e) => { st[period] = e.target.value; const box = e.target.closest(".period"); box.replaceWith(...await periodView(period, index, st)); } },
    list.slice().reverse().map((k) => h("option", { value: k, selected: k === key }, period === "month" ? thMonth(k) : "ปี " + (Number(k) + 543)))) : null;
  const top = rec.top.map(rowToVideo);
  const nDays = (rec.days || []).length;
  const wrap = h("div", { class: "period" },
    h("div", { class: "row", style: { marginBottom: "10px" } }, pick),
    h("div", { class: "hero" }, h("div", { class: "note" }, "สรุป" + (period === "month" ? "รายเดือน" : "รายปี")), h("div", { class: "big" }, name),
      h("p", { style: { margin: 0 } }, `รวมจาก ${nDays} วันที่ระบบเก็บได้ (วิวที่เพิ่มของแต่ละวันบวกกัน) — ${nDays < 7 ? "ยังเก็บได้ไม่กี่วัน ตัวเลขจะครบขึ้นเรื่อยๆ" : "ยิ่งเก็บครบเดือน ยิ่งแม่น"}`)),
    section("หมวดที่ได้วิวมากที่สุด", name, h("div", { class: "card" }, hbars(rec.themes.slice(0, 14).map((t) => ({
      label: (THEME_BY_ID[t.id]?.icon || "") + " " + (THEME_BY_ID[t.id]?.name || t.id), value: t.share, display: pct(t.share), tip: `${THEME_BY_ID[t.id]?.name}\n${num(t.v)} วิว`,
    })), { head: ["หมวด", "% ของวิว"] }))),
    topList(`Top ${Math.min(100, top.length)} คลิปของ${period === "month" ? "เดือน" : "ปี"}`, top.slice(0, 100), st),
    rec.trends?.length ? section("เรื่องที่คนไทยค้นใน Google บ่อยที่สุด", "ติดเทรนด์กี่วัน", h("div", { class: "card" },
      hbars(rec.trends.slice(0, 15).map((t) => ({ label: t[0], value: t[2], display: `${t[2]} วัน`, tip: `${t[0]}\nติดเทรนด์ ${t[2]} วัน · สูงสุด ${num(t[1])}+ ค้นหา` })), { head: ["เรื่อง", "จำนวนวัน"], color: "var(--s4)" }))) : null);
  return [wrap];
}

// ---------------------------------------------------------------- Laos
function laoView(latest) {
  const lo = latest.lao;
  const out = [];
  out.push(h("div", { class: "warn" }, "ข้อมูลลาวมีน้อยกว่าไทยมาก: Google Trends ไม่มีลาว, YouTube ไม่มีชาร์ตลาว ระบบจึงค้นด้วยคำลาวแล้วเก็บเฉพาะคลิปที่ชื่อเป็นอักษรลาวหรือช่องที่ตั้งประเทศเป็นลาว (คลิปภาษาไทยที่พูดถึงลาวก็นับด้วย ถ้าช่องอยู่ในลาว)"));
  out.push(h("div", { class: "grid g3", style: { marginTop: "14px" } },
    tile("คลิปลาวที่ติดตาม", num(latest.counts.lo)), tile("วิวรวม 24 ชม.", num(lo.total)), tile("หมวดอันดับ 1", lo.themes[0] ? (THEME_BY_ID[lo.themes[0].id]?.icon || "") + " " + pct(lo.themes[0].share) : "–", lo.themes[0] ? THEME_BY_ID[lo.themes[0].id]?.name : "")));
  if (lo.themes.length) out.push(section("คนลาวดูหมวดไหน", "% ของวิว 24 ชม.", h("div", { class: "card" }, hbars(lo.themes.slice(0, 10).map((t) => ({ label: (THEME_BY_ID[t.id]?.icon || "") + " " + (THEME_BY_ID[t.id]?.name || t.id), value: t.share, display: pct(t.share) })), { head: ["หมวด", "% ของวิว"], color: "var(--s3)" }))));
  out.push(section("Top คลิปลาว", "วิวเพิ่มใน 24 ชม.", h("div", { class: "vlist lao" }, lo.top.slice(0, 30).map((v, i) => videoCard(v, i + 1, { onSave: save })))));
  if (lo.channels?.length) out.push(section("ช่องลาวที่ระบบเจอ", "เรียงตามผู้ติดตาม", h("div", { class: "card" }, hbars(lo.channels.slice(0, 15).map((c) => ({ label: c.t, value: c.subs, tip: `${c.t}\n${num(c.subs)} ผู้ติดตาม · ${num(c.views)} วิวรวม` })), { head: ["ช่อง", "ผู้ติดตาม"], color: "var(--s7)" }),
    h("p", { class: "src" }, "อันดับช่องลาว Top 100 ที่ครบกว่า: ", h("a", { href: "https://vidiq.com/youtube-stats/top/country/la/", target: "_blank", rel: "noopener" }, "vidIQ ลาว"), " (เปิดด้วยเน็ตมือถือหรือที่บ้าน)"))));
  out.push(h("div", { class: "tip-box" }, "คนลาวส่วนใหญ่อยู่บน Facebook (ราว 4.6-5.1 ล้านคน) — สถิติเพจ วันๆ One One ของ Win เองจะเป็น Mr News ฝั่งลาวที่แม่นที่สุด เมื่อเพจเริ่มมีคนลาวดู"));
  return out;
}

function linksSection() {
  const L = [
    ["TikTok Creative Center", "https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en", "แฮชแท็กที่มาแรง เลือก Thailand · 7/30/120 วัน"],
    ["Playboard (ไทย รายวัน)", "https://playboard.co/en/chart/video/most-viewed-all-videos-in-thailand-daily", "อันดับคลิป YouTube ไทย รายวัน-รายปี (อัปเดต 17:00 น.)"],
    ["YouTube Charts", "https://charts.youtube.com/", "เพลงมาแรง + เพลงที่คนใช้ทำ Shorts (เลือก Thailand)"],
    ["Google Trends ไทย", "https://trends.google.com/trending?geo=TH", "เทรนด์ค้นหา 4 ชม. ถึง 7 วัน"],
    ["trends24 (X ไทย)", "https://trends24.in/thailand/", "เทรนด์ X ส่วนใหญ่เป็นแฟนคลับซีรีส์"],
    ["HypeAuditor TikTok ไทย", "https://hypeauditor.com/top-tiktok-thailand/", "ครีเอเตอร์ TikTok ไทย ดูคอลัมน์ \"แชร์เฉลี่ย\""],
    ["NoxInfluencer ไทย", "https://www.noxinfluencer.com/youtube-channel-rank/top-100-th-all-youtuber-sorted-by-subs-weekly", "ช่อง YouTube ไทย เรียงตาม Growth"],
    ["vidIQ ลาว", "https://vidiq.com/youtube-stats/top/country/la/", "Top 100 ช่อง YouTube ลาว"],
  ];
  return section("เว็บที่ระบบดึงให้ไม่ได้ (กดเปิดเอง)", "ใช้เน็ตมือถือหรือเน็ตบ้าน — เน็ตบริษัทบล็อก TikTok และ YouTube",
    h("div", { class: "grid g2" }, L.map(([name, url, what]) => h("a", { class: "card", href: url, target: "_blank", rel: "noopener", style: { textDecoration: "none", color: "inherit" } },
      h("b", {}, name, " ↗"), h("div", { class: "note" }, what)))),
    h("div", { class: "card", style: { marginTop: "14px" } }, h("b", {}, "Facebook: Inspiration Hub (ในแอปเท่านั้น)"),
      h("ol", { class: "note", style: { margin: "6px 0 0" } }, h("li", {}, "เปิดเพจ วันๆ One One ในแอป Facebook"), h("li", {}, "เข้า Professional Dashboard"), h("li", {}, "หาเมนู Inspiration Hub → ดู Reels แฮชแท็ก และเพลงที่มาแรง")),
      h("p", { class: "note", style: { margin: "6px 0 0" } }, "Facebook ไม่มีอันดับสาธารณะให้ดึง (Meta ปิด CrowdTangle ไปแล้วตั้งแต่ 14 ส.ค. 2024)")));
}
