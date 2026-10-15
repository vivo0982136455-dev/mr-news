// Small shared rules used by the robot (scripts/) and the pages (js/).

// ---- title styles a reader can SEE (facts, not causes) ----
export const TITLE_STYLES = [
  ["question", "ชื่อเป็นคำถาม", /\?|ไหม|มั้ย|ยังไง|อะไร|ทำไม|ใคร(?!ๆ)|เท่าไร|กี่/],
  ["story", "ชื่อเล่าเรื่อง (เมื่อ…)", /^เมื่อ|^ตอนที่|^วันที่|^พอ/],
  ["number", "มีตัวเลขในชื่อ", /(^|\s)\d+\s?(อันดับ|วิธี|ข้อ|เมนู|ชั่วโมง|วัน|บาท)/],
  ["quote", "มีคำพูดในชื่อ", /[“”"]/],
];
export const STYLE_NAME = Object.fromEntries(TITLE_STYLES.map(([id, name]) => [id, name]));
export const cleanTitle = (t) => String(t || "").replace(/#\S+/g, "").trim();
// "ทำไมแมวกลัวแตงกวา? #cat" -> ["question"]; a question is not also counted as a story
export function titleStyles(t) {
  const c = cleanTitle(t);
  const got = TITLE_STYLES.filter(([, , re]) => re.test(c)).map(([id]) => id);
  return got.includes("question") ? got.filter((x) => x !== "story") : got;
}

// ---- weeks, Thai time: a week starts on Monday ----
export const thaiNow = (ms = Date.now()) => new Date(ms + 7 * 3600e3);
export const thaiDay = (ms = Date.now()) => thaiNow(ms).toISOString().slice(0, 10);
// the Monday of the week of a Thai day "2026-10-15" -> "2026-10-12"
export function weekOf(day) {
  const d = new Date(day + "T00:00:00Z");
  const back = (d.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(d.getTime() - back * 864e5).toISOString().slice(0, 10);
}
export const addDays = (day, n) => new Date(Date.parse(day + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
