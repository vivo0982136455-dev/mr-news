// Win's own work, kept ONLY in this browser (like the notebook): the first-time setup, this week's plan,
// the results of his own clips and the Sunday reviews. Backed up together with the notes (สมุด → สำรองเป็นไฟล์).
import { store, toast } from "./ui.js";
import { thaiDay, weekOf, addDays } from "./shared/patterns.js";

export const KEYS = ["mn_setup", "mn_plan", "mn_results", "mn_reviews", "mn_today"];

// ---------------------------------------------------------------- setup (3 questions + one plan sentence)
// { themes: ["couple", "food"], format: "short" | "long" | "both", minutes: 3 | 10 | 30, when: "เลิกกะ", what: "...",
//   at, skipped } - every answer may be empty
export const getSetup = () => store.get("mn_setup", null);
export const saveSetup = (s) => store.set("mn_setup", { ...s, at: new Date().toISOString() });

// ---------------------------------------------------------------- the weekly plan
// { weeks: { "2026-10-12": { items: [{ id, t, page, src, shot, cut, posted }] } } }
export const PLAN_MAX = 3;
export const STEPS = [["shot", "ถ่ายแล้ว"], ["cut", "ตัดแล้ว"], ["posted", "โพสต์แล้ว"]];
const getPlan = () => store.get("mn_plan", { weeks: {} });
export const thisWeek = () => weekOf(thaiDay());
export function weekItems(week = thisWeek()) {
  return getPlan().weeks[week]?.items || [];
}
function saveWeek(week, items) {
  const p = getPlan();
  p.weeks[week] = { ...(p.weeks[week] || {}), items };
  return store.set("mn_plan", p);
}
// add an idea to this week's plan (3 at most - a small plan that gets done beats a big one that does not)
export function addToPlan({ t, page = "", src = "" }) {
  const items = weekItems();
  if (items.some((x) => x.t === t)) { toast("ไอเดียนี้อยู่ในแผนสัปดาห์นี้แล้ว"); return false; }
  if (items.length >= PLAN_MAX) { toast(`แผนสัปดาห์นี้มีครบ ${PLAN_MAX} ไอเดียแล้ว — ทำให้เสร็จก่อน หรือลบออก 1 ไอเดีย`); return false; }
  items.push({ id: Date.now().toString(36), t: String(t).slice(0, 200), page, src, shot: false, cut: false, posted: false });
  saveWeek(thisWeek(), items);
  toast(`ใส่แผนสัปดาห์แล้ว (${items.length}/${PLAN_MAX}) 🗓️`);
  return true;
}
export function setStep(id, step, on) {
  const items = weekItems();
  const it = items.find((x) => x.id === id);
  if (!it) return;
  // ticking a later step ticks the earlier ones; unticking an earlier step unticks the later ones
  const order = STEPS.map(([k]) => k);
  const i = order.indexOf(step);
  order.forEach((k, j) => { if (on && j <= i) it[k] = true; if (!on && j >= i) it[k] = false; });
  saveWeek(thisWeek(), items);
}
export function removeFromPlan(id) {
  saveWeek(thisWeek(), weekItems().filter((x) => x.id !== id));
}
export const weekDone = (items) => items.length > 0 && items.every((x) => x.posted);

// "weeks in a row with every planned clip posted". A missed week uses a freeze (2 at the start, one earned back
// per finished week, at most 2) instead of breaking the streak - no blame for a hard week at work.
// weeks = { "2026-10-12": { items } }, now = the Monday of this week. The current week counts only once it is done.
export const FREEZES = 2;
export function streakOf(weeks, now = thisWeek()) {
  const planned = Object.keys(weeks).filter((w) => (weeks[w].items || []).length).sort();
  if (!planned.length) return { streak: 0, freezes: FREEZES, frozen: 0, best: 0 };
  let streak = 0, freezes = FREEZES, frozen = 0, best = 0;
  for (let w = planned[0]; w < now; w = addDays(w, 7)) {
    if (weekDone(weeks[w]?.items || [])) { streak++; freezes = Math.min(FREEZES, freezes + 1); }
    else if (freezes > 0) { freezes--; frozen++; }
    else streak = 0;
    best = Math.max(best, streak);
  }
  if (weekDone(weeks[now]?.items || [])) streak++;
  return { streak, freezes, frozen, best: Math.max(best, streak) };
}
export const myStreak = () => streakOf(getPlan().weeks);

// ---------------------------------------------------------------- results of Win's own clips
// { id, date, where, page, t, link, views, stay, likes, comments, shares, subs }
export const WHERE = [["yt-short", "YouTube Shorts"], ["yt-long", "YouTube คลิปยาว"], ["fb-reel", "Facebook Reels"], ["tiktok", "TikTok"]];
export const getResults = () => store.get("mn_results", []);
export const saveResults = (list) => store.set("mn_results", list);
// the middle value; with an even count, the average of the two middle values (1,000 and 3,000 -> 2,000)
export const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// Win's own usual views on one platform = the median of his last 10 clips there (his own yardstick, not anyone else's)
export function myUsual(list, where) {
  return median(list.filter((r) => r.where === where && r.views >= 0).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10).map((r) => +r.views));
}
export function timesMyUsual(r, list) {
  const u = myUsual(list.filter((x) => x.id !== r.id), r.where);
  return u > 0 ? Math.round((r.views / u) * 10) / 10 : null;
}

// ---------------------------------------------------------------- Sunday reviews
// { id, week, best, worst, why, hypo, change, at }
export const getReviews = () => store.get("mn_reviews", []);
export const saveReviews = (list) => store.set("mn_reviews", list);

// ---------------------------------------------------------------- today's small task
export const todayDone = () => store.get("mn_today", {}).day === thaiDay();
export const setTodayDone = (on) => store.set("mn_today", on ? { day: thaiDay() } : {});
