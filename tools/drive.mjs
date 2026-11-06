// Drives the published DOOM page in a real browser and proves the game is live and takes keys.
//   node drive.mjs <url> <out dir> [chromium|firefox|webkit] [stage]
// stage "show": press Run and wait for the game to show in the port 8080 card (screenshots).
// stage "play" (default): also start a new game with the keyboard, walk and fire, and check the picture changes.
// Prints the times (Run to ready, Run to first game frame), how often the picture changes, and the tab's memory.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
// WMN_DIR: the wmn checkout whose Playwright is used (default: ../wmn next to this repo).
const wmnDir = process.env.WMN_DIR || path.resolve(import.meta.dirname, "../../wmn");
const require = createRequire(path.join(wmnDir, "package.json"));
const pw = require("@playwright/test");

const [url, out, browserName = "chromium", stage = "play"] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node drive.mjs <url> <out dir> [chromium|firefox|webkit] [show|play]");
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });
const t0 = Date.now();
const at = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const log = (...a) => console.log(at(), browserName, ...a);

const browser = await pw[browserName].launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
page.on("pageerror", (e) => log("page error:", e.message.slice(0, 300)));
const shot = (n) => page.screenshot({ path: path.join(out, `${browserName}-${n}.png`) });
const card = page.locator("section.wmn-port").filter({ has: page.locator(".wmn-port-chip-text", { hasText: /^port 8080$/ }) });
const frameEl = card.locator("iframe.wmn-port-iframe");
const game = card.frameLocator("iframe.wmn-port-iframe");
// A picture of the game alone (the frame's box), for comparing frames.
const gameShot = (n) => frameEl.screenshot(n ? { path: path.join(out, `${browserName}-${n}.png`) } : {});

// How many new pictures noVNC drew in `ms`: read inside the game frame (a sample of the canvas every 20 ms). A browser
// that does not let a test run code in the sandboxed frame (Firefox) is measured from screenshots of the frame instead.
async function changesPerSecond(ms) {
  try {
    const f = await (await frameEl.elementHandle()).contentFrame();
    const n = await f.evaluate(async (ms) => {
      const c = document.querySelector("#screen canvas");
      const g = c.getContext("2d", { willReadFrequently: true });
      let last = "";
      let changes = 0;
      const end = performance.now() + ms;
      while (performance.now() < end) {
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let h = 0;
        for (let i = 0; i < d.length; i += 97) h = (h * 31 + d[i]) | 0;
        const k = `${c.width}x${c.height}:${h}`;
        if (k !== last) changes++;
        last = k;
        await new Promise((r) => setTimeout(r, 20));
      }
      return changes;
    }, ms);
    return { perSec: n / (ms / 1000), how: "canvas" };
  } catch {
    let last = await gameShot();
    let changes = 0;
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const s = await gameShot();
      if (!s.equals(last)) changes++;
      last = s;
    }
    return { perSec: changes / (ms / 1000), how: "screenshots" };
  }
}

try {
  await page.goto(url);
  log("isolated:", await page.evaluate(() => crossOriginIsolated));
  await page.locator("button.run-btn").first().click();
  const tRun = Date.now();
  // The block's code holds both sentences once; its output adds a second copy of one.
  const count = (word) => page.evaluate((w) => document.body.innerText.split(w).length - 1, word);
  for (;;) {
    if ((await count("noVNC did not answer")) >= 2) throw new Error("the block says noVNC did not answer");
    if ((await count("DOOM is ready")) >= 2) break;
    if (Date.now() - tRun > 900000) throw new Error("the block never said DOOM is ready");
    await page.waitForTimeout(1000);
  }
  log(`ready: ${((Date.now() - tRun) / 1000).toFixed(1)} s after Run`);
  await frameEl.waitFor({ timeout: 120000 });
  await frameEl.scrollIntoViewIfNeeded();
  await game.locator("#status").filter({ hasText: /Click the game/ }).waitFor({ timeout: 300000 });
  await game.locator("#screen canvas").waitFor({ timeout: 60000 });
  log(`first game frame: ${((Date.now() - tRun) / 1000).toFixed(1)} s after Run`);
  await page.waitForTimeout(3000);
  await shot("1-shown");
  await gameShot("1-game");
  const demo = await changesPerSecond(10000);
  log(`attract demo: ${demo.perSec.toFixed(1)} new pictures a second (${demo.how})`);
  if (demo.perSec === 0) throw new Error("the picture never changed during the attract demo");
  if (stage === "show") process.exit(0);

  // Into the game: click it, then the menus with the keyboard (Esc opens the menu; Enter: New Game, episode, skill).
  await game.locator("#screen canvas").click();
  // The game answers slowly in the machine: a key pressed before the last one was taken is lost, so the gaps are long.
  for (const k of ["Escape", "Enter", "Enter", "Enter", "Enter"]) {
    await page.keyboard.press(k);
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(5000);
  const before = await gameShot("2-in-game");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1500);
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(800);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("Control");
  await page.waitForTimeout(400);
  await page.keyboard.up("Control");
  await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(1500);
  const after = await gameShot("3-after-keys");
  await shot("3-page");
  if (before.equals(after)) throw new Error("the picture did not change after the keys");
  log("keys: the picture changed after walking, turning and firing");
  await page.keyboard.down("ArrowLeft");
  const play = await changesPerSecond(10000);
  await page.keyboard.up("ArrowLeft");
  log(`in game: ${play.perSec.toFixed(1)} new pictures a second (${play.how})`);
  // The browser's memory as the system counts it: every process this driver started (the browser and its tab, GPU and
  // worker processes), resident set size summed.
  const rows = execSync("ps -axo pid=,ppid=,rss=").toString().trim().split("\n").map((l) => l.trim().split(/\s+/).map(Number));
  const kids = new Set([process.pid]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [pid, ppid] of rows) if (kids.has(ppid) && !kids.has(pid)) { kids.add(pid); grew = true; }
  }
  const rss = rows.filter(([pid]) => kids.has(pid) && pid !== process.pid).reduce((a, r) => a + r[2], 0);
  log(`memory: ${Math.round(rss / 1024)} MB for the whole browser (the system's count)`);
} catch (e) {
  log("FAILED:", e.message);
  await shot("fail").catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
