// Drive a real headless Microsoft Edge through the DevTools protocol (no packages: Node 22+ has fetch + WebSocket).
// Adapted from the Lao Kip project's tests/browser.js.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SHOTS = path.join(path.dirname(fileURLToPath(import.meta.url)), "shots");
const BROWSERS = [process.env.BROWSER_PATH, "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/microsoft-edge", "/usr/bin/google-chrome"];
const EDGE = BROWSERS.find((p) => p && fs.existsSync(p));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9444 } = {}) {
  if (!EDGE) throw new Error("No Edge / Chrome found - set BROWSER_PATH");
  const profile = path.join(os.tmpdir(), `mrnews-test-${port}-${Date.now()}`);
  fs.mkdirSync(SHOTS, { recursive: true });
  const child = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync", "about:blank"], { stdio: "ignore" });
  let info = null;
  for (let i = 0; i < 60 && !info; i++) {
    await sleep(250);
    try { info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { /* not up yet */ }
  }
  if (!info) throw new Error("the browser did not start");
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error("no connection to the browser")); });
  let nextId = 1;
  const waiting = new Map();
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) for (const fn of listeners) fn(msg);
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`no answer to "${method}" in 90 s`)); }, 90000);
    waiting.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  async function newPage({ width = 380, height = 820 } = {}) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    const page = { errors: [] };
    listeners.push((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") page.errors.push("exception: " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
      if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) page.errors.push(msg.params.type + ": " + msg.params.args.map((a) => a.value || a.description || "").join(" "));
      if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error" && !/i\.ytimg\.com|fonts\.g/.test(msg.params.entry.url || "")) page.errors.push("log: " + msg.params.entry.text + " " + (msg.params.entry.url || ""));
      if (msg.method === "Page.loadEventFired") page.loaded && page.loaded();
    });
    await s("Page.enable");
    await s("Runtime.enable");
    await s("Log.enable");
    page.size = async (w, h, dark = false) => {
      const mobile = w < 700;
      await s("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await s("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
    };
    await page.size(width, height);
    page.goto = async (url, wait = 1200) => {
      const done = new Promise((r) => (page.loaded = r));
      const r = await s("Page.navigate", { url });
      if (r.errorText) throw new Error("navigate: " + r.errorText);
      if (r.loaderId) await Promise.race([done, sleep(20000)]);
      await sleep(wait);
    };
    page.eval = async (expression) => {
      const r = await s("Runtime.evaluate", { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error("in page: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    page.until = async (expr, ms = 10000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        try { if (await page.eval(`return !!(${expr});`)) return true; } catch { /* navigating */ }
        await sleep(150);
      }
      return false;
    };
    page.shot = async (file, full = false) => {
      const params = { format: "png" };
      if (full) {
        const m = await s("Page.getLayoutMetrics");
        params.clip = { x: 0, y: 0, width: m.cssContentSize.width, height: Math.min(m.cssContentSize.height, 9000), scale: 1 };
        params.captureBeyondViewport = true;
      }
      const r = await s("Page.captureScreenshot", params);
      fs.writeFileSync(path.join(SHOTS, file), Buffer.from(r.data, "base64"));
    };
    page.close = () => send("Target.closeTarget", { targetId });
    page.cdp = s; // raw DevTools command, e.g. page.cdp("Page.getInstallabilityErrors")
    return page;
  }
  async function close() {
    try { await send("Browser.close"); } catch { /* gone */ }
    await sleep(300);
    try { child.kill(); } catch { /* gone */ }
    for (let i = 0; i < 10; i++) { try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(400); } }
  }
  return { newPage, close };
}
