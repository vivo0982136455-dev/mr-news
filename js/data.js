// Reads the robot's JSON files. One copy per page visit; "no-cache" asks the server whether a newer file exists.
// Without a connection the app (sw.js) answers with the copy saved on the phone and marks it "X-Offline-Copy":
// then a small note tells the reader that the numbers are the last ones saved.
import { toast } from "./ui.js";

const cache = new Map();
let warned = false;
export function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      if (r.headers.get("X-Offline-Copy") && !warned) {
        warned = true;
        document.documentElement.dataset.offline = "1";
        toast("ไม่มีเน็ต: แสดงข้อมูลล่าสุดที่เก็บไว้ในเครื่อง");
      }
      return r.json();
    }).catch((e) => {
      cache.delete(path); // try again next time
      throw e;
    }));
  }
  return cache.get(path);
}
export const tryJSON = (path) => getJSON(path).catch(() => null);
