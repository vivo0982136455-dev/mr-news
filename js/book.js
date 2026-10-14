// The book's chapters and their lessons (ids must match js/content/<chapter>.js - tests/content.mjs checks it).
// "Read" ticks are kept in this browser only (localStorage "mn_read").
import { store } from "./ui.js";

export const CHAPTERS = [
  { id: "handbook", icon: "📘", title: "คู่มือครีเอเตอร์", sub: "หาเงินจาก Facebook / YouTube ยังไง ต้องมีผู้ติดตามเท่าไร คิดเงินยังไง + Top 100 คนดังของโลก", load: () => import("./content/handbook.js") },
  { id: "human", icon: "🎬", title: "ทำคลิปคนจริง (วันๆ One One)", sub: "โปรเจกต์มือใหม่: ถ่ายด้วยมือถือ ตัดต่อ CapCut ให้ AI ตรวจ จนอัปโหลด Facebook + YouTube", load: () => import("./content/human.js") },
  { id: "ai", icon: "🤖", title: "ทำคลิป AI", sub: "จากไอเดีย → prompt → ภาพ → วิดีโอ → เสียง → ตัดต่อ → โพสต์ พร้อมโปรเจกต์ตัวอย่าง", load: () => import("./content/ai.js") },
];

export const LESSON_IDS = {
  handbook: ["hb-start", "hb-youtube", "hb-facebook", "hb-other", "hb-calc", "hb-top", "hb-truth", "hb-rules", "hb-90"],
  human: ["hu-map", "hu-gear", "hu-plan", "hu-shoot", "hu-light", "hu-sound", "hu-edit", "hu-text", "hu-music", "hu-check", "hu-cover", "hu-youtube", "hu-facebook", "hu-measure", "hu-project"],
  ai: ["ai-map", "ai-tools", "ai-bible", "ai-script", "ai-prompt", "ai-image", "ai-video", "ai-voice", "ai-edit", "ai-label", "ai-project", "ai-best"],
};

export const readSet = () => new Set(store.get("mn_read", []));
export function setRead(id, on) {
  const s = readSet();
  if (on) s.add(id);
  else s.delete(id);
  store.set("mn_read", [...s]);
  window.dispatchEvent(new Event("mn-progress"));
}
export function chapterProgress(chapter) {
  const ids = LESSON_IDS[chapter] || [];
  const s = readSet();
  return { done: ids.filter((i) => s.has(i)).length, total: ids.length };
}
