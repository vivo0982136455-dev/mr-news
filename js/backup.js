// Backup of everything Win keeps in this browser (notes, setup, plan, clip results, reviews, review questions),
// and the reminder when the last backup is 7+ days old. On a phone the file goes to the share sheet (save to
// Google Drive, LINE Keep, Files…); elsewhere it downloads. Also: share a text to LINE / any app.
import { h, store, toast } from "./ui.js";
import { allNotes } from "./notes-store.js";
import { KEYS } from "./my-store.js";

export const BACKUP_EVERY_DAYS = 7;
const LAST = "mn_last_backup";

export function makeBackup() {
  const mine = Object.fromEntries(KEYS.map((k) => [k, store.get(k, null)]).filter(([, v]) => v != null));
  // version 2 (Oct 2026) also carries Win's setup, weekly plan, clip results, Sunday reviews and review questions
  return { name: `mr-news-backup-${new Date().toISOString().slice(0, 10)}.json`, text: JSON.stringify({ app: "mr-news", version: 2, notes: allNotes(), mine }, null, 1) };
}

export function download(name, text, type) {
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a);
  a.click();
  a.remove();
}

// share sheet with the file where the phone supports it, else a download; remembers the day
export async function backupNow() {
  const { name, text } = makeBackup();
  const file = typeof File === "function" ? new File([text], name, { type: "application/json" }) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "สำรองสมุด Mr News" });
    } else download(name, text, "application/json");
  } catch (e) {
    if (e.name === "AbortError") return false; // closed the share sheet: not backed up
    download(name, text, "application/json");
  }
  store.set(LAST, new Date().toISOString());
  toast("สำรองแล้ว ✓ เก็บไฟล์ไว้ในที่ปลอดภัย (Drive, LINE Keep)");
  return true;
}

const hasData = () => allNotes().length > 0 || KEYS.some((k) => { const v = store.get(k, null); return v && (Array.isArray(v) ? v.length : Object.keys(v).length); });
// days since the last backup; null = nothing to back up yet
export function backupAgeDays() {
  if (!hasData()) return null;
  const last = store.get(LAST, null);
  return last ? Math.floor((Date.now() - Date.parse(last)) / 864e5) : Infinity;
}

// the reminder card: only when there is something to lose and no backup for 7 days (or never)
export function backupNag(onDone) {
  const age = backupAgeDays();
  if (age == null || age < BACKUP_EVERY_DAYS) return null;
  return h("div", { class: "warn backup-nag", role: "status" },
    h("span", {}, age === Infinity ? "💾 ยังไม่เคยสำรองสมุด แผน และผลคลิป — ถ้าล้างเบราว์เซอร์หรือเปลี่ยนมือถือจะหายหมด" : `💾 ไม่ได้สำรองมา ${age} วันแล้ว`),
    h("button", { class: "btn small primary", type: "button", onclick: async () => { if (await backupNow()) onDone && onDone(); } }, "สำรองตอนนี้"));
}

// share a short text: the phone's share sheet when there is one, otherwise LINE's share page
export async function share(text, url = location.href.split("#")[0]) {
  if (navigator.share) {
    try { await navigator.share({ text, url }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  window.open(`https://line.me/R/share?text=${encodeURIComponent(text + "\n" + url)}`, "_blank", "noopener");
}
export const shareButton = (getText, label = "📤 แชร์") => h("button", { class: "btn small share-btn", type: "button", onclick: () => share(getText()) }, label);
