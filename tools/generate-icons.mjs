// Rasterise the maintained SVG project mark for browser-store required PNG sizes.
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
const svg = await readFile(new URL("../website/logo.svg", import.meta.url), "utf8");
const browser = await chromium.launch({
  channel: process.env.TEST_BROWSER_CHANNEL || "msedge",
  headless: true,
});
try {
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    const encoded = await page.evaluate(
      async ({ svg, size }) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const image = new Image();
        image.src = "data:image/svg+xml;base64," + btoa(svg);
        await image.decode();
        canvas.getContext("2d").drawImage(image, 0, 0, size, size);
        return canvas.toDataURL("image/png").split(",")[1];
      },
      { svg, size },
    );
    await writeFile(
      new URL(`../extension/assets/icons/icon${size}.png`, import.meta.url),
      Buffer.from(encoded, "base64"),
    );
  }
} finally {
  await browser.close();
}
