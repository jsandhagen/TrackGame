// Regenerates every app icon from scripts/icon.html (web, Android adaptive and legacy).
// Needs Playwright with Chromium: node scripts/render-icons.cjs
const { chromium } = require("playwright");
const { writeFileSync, mkdirSync } = require("node:fs");
const { dirname, join } = require("node:path");

const root = join(__dirname, "..");
const res = "android/app/src/main/res";
const OUT = {
  "web/512": ["public/icons/icon-512.png"],
  "web/192": ["public/icons/icon-192.png"],
  "android/fg": [`${res}/mipmap-xxxhdpi/ic_launcher_foreground.png`],
  "android/bg": [`${res}/mipmap-xxxhdpi/ic_launcher_background.png`],
  "android/legacy": [`${res}/mipmap-xxxhdpi/ic_launcher.png`],
  "android/legacyRound": [`${res}/mipmap-xxxhdpi/ic_launcher_round.png`],
};

(async () => {
  const { createServer } = await import("vite");
  const server = await createServer({ root, logLevel: "error", server: { port: 0, host: "127.0.0.1" } });
  await server.listen();
  const url = server.resolvedUrls.local[0] + "scripts/icon.html";
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForFunction(() => window.iconData);
    for (const [key, files] of Object.entries(OUT)) {
      const data = await page.evaluate((k) => window.iconData(k), key);
      const png = Buffer.from(data.split(",")[1], "base64");
      for (const file of files) {
        mkdirSync(dirname(join(root, file)), { recursive: true });
        writeFileSync(join(root, file), png);
        console.log("wrote", file);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
})();
