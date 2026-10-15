// Mr Idea of the day: which themes are big AND rising among Thai creator videos today, the proof (real videos),
// and one idea per page from the idea bank, rotated by date so the same theme gives a new idea tomorrow.
import { THEME_BY_ID, isShort } from "../js/shared/themes.js";
import { IDEAS } from "../js/shared/ideabank.js";

const FIT_WEIGHT = [0.3, 0.6, 0.85, 1];
const dayNumber = (day) => Math.floor(Date.parse(day + "T00:00:00Z") / 864e5);

export function buildIdeas(latest, pastDays = []) {
  const c = latest.creator;
  const n = dayNumber(latest.day);
  const cards = [];
  for (const t of c.themes) {
    const theme = THEME_BY_ID[t.id];
    if (!theme || t.n < 3) continue; // a theme needs at least 3 videos today to say anything
    const momentum = t.prev ? t.share / t.prev - 1 : null; // +0.35 = 35% bigger share than the last days
    const boost = momentum == null ? 1 : 1 + Math.max(-0.5, Math.min(1, momentum));
    const score = t.share * boost * FIT_WEIGHT[theme.fit];
    const vids = c.top.filter((v) => v.themes.includes(t.id));
    const shorts = vids.filter(isShort);
    const bank = IDEAS[t.id] || {};
    const pickIdea = (list, k) => (list && list.length ? list[(n + k) % list.length] : null);
    cards.push({
      theme: t.id,
      name: theme.name,
      icon: theme.icon,
      fit: theme.fit,
      views: t.v,
      count: t.n,
      share: t.share,
      momentum,
      score,
      shortShare: vids.length ? shorts.length / vids.length : null,
      medianSec: vids.length ? [...vids.map((v) => v.d)].sort((a, b) => a - b)[Math.floor(vids.length / 2)] : null,
      examples: vids.slice(0, 4).map((v) => ({ id: v.id, t: v.t, cn: v.cn, g: v.g, d: v.d, m: v.m })),
      tags: (c.tags || []).filter((tg) => vids.some((v) => v.t.toLowerCase().includes(tg.k))).slice(0, 5).map((tg) => tg.k),
      couple: pickIdea(bank.couple, 0),
      ai: pickIdea(bank.ai, 1),
    });
  }
  cards.sort((a, b) => b.score - a.score);
  const top = cards.slice(0, 8);
  // the two best-fitting rising themes, to combine
  const fitting = top.filter((x) => x.fit >= 2).slice(0, 2);
  return {
    day: latest.day,
    updated: latest.updated,
    ytAt: latest.ytAt, // the time of the numbers the ideas come from
    cards: top,
    mix: fitting.length === 2 ? fitting.map((x) => ({ theme: x.theme, name: x.name, icon: x.icon })) : null,
    trends: (latest.trends.today || []).slice(0, 10).map((x) => x.q),
    tags: (c.tags || []).slice(0, 12).map((x) => x.k),
    pastDays: pastDays.length,
  };
}
