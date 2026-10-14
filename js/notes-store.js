// Win's notebook ("สมุด Mr News"): kept ONLY in this browser (localStorage). Export / import makes a backup file.
// Columns follow the research report: date, source, link, topic, format, sound, views, why people watch, which page.
import { store, toast } from "./ui.js";

const KEY = "mn_notes";
export const PAGES_FOR = ["วันๆ One One", "เพจ AI", "ทั้งสองเพจ", "ยังไม่รู้"];
export const KINDS = ["เทรนด์", "ไอเดีย", "บท / มุก", "ผลคลิปของเรา"];

export const allNotes = () => store.get(KEY, []);
export function saveNotes(list) {
  const ok = store.set(KEY, list);
  if (!ok) toast("บันทึกไม่ได้: เบราว์เซอร์นี้ปิดการเก็บข้อมูลไว้");
  return ok;
}
export function addNote(n) {
  const list = allNotes();
  const note = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), kind: "เทรนด์", page: "ยังไม่รู้", ...n };
  list.unshift(note);
  if (saveNotes(list)) toast("จดลงสมุดแล้ว 📒");
  return note;
}
// a video card -> a note
export function noteFromVideo(v, source = "Mr News") {
  return addNote({
    kind: "เทรนด์",
    source,
    link: `https://www.youtube.com/watch?v=${v.id}`,
    topic: v.t,
    format: v.d ? (v.d <= 180 ? `Shorts ${v.d} วิ` : `คลิปยาว ${Math.round(v.d / 60)} นาที`) : "",
    views: v.g != null ? `+${v.g} วิว/24 ชม.` : v.v != null ? `${v.v} วิว` : "",
    channel: v.cn,
    why: "",
  });
}
