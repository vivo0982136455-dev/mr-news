// YouTube is read once a day at the same time of day, so every day's "24 h" numbers cover the same hours and land
// on the same Thai day: in the Thai evening window 19:00-23:59 (12:00-16:59 UTC) - the 12:17 UTC run, or the 14:47
// UTC backup run when GitHub drops or delays the first. If nothing was read for 30 h, the next run reads anyway.
export const YT_WINDOW_THAI = [19, 24];
export function youtubeDue(hoursSinceLast, now = new Date()) {
  const thaiHour = (now.getUTCHours() + 7) % 24;
  const inWindow = thaiHour >= YT_WINDOW_THAI[0] && thaiHour < YT_WINDOW_THAI[1];
  return hoursSinceLast >= 30 || (hoursSinceLast >= 20 && inWindow);
}
