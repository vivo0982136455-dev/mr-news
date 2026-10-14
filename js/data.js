// Reads the robot's JSON files. One copy per page visit; "no-cache" asks the server whether a newer file exists.
const cache = new Map();
export function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json();
    }).catch((e) => {
      cache.delete(path); // try again next time
      throw e;
    }));
  }
  return cache.get(path);
}
export const tryJSON = (path) => getJSON(path).catch(() => null);
