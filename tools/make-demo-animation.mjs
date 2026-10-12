// Compose recorded UI screenshots into a script-free, reduced-motion-aware SVG slideshow.
import { readFile, writeFile } from "node:fs/promises";
const frames = [
  ["website.png", "01 / Website — install and access your account"],
  ["dashboard.png", "02 / Dashboard — private local assessments"],
  ["warning-high.png", "03 / High risk — validated warning response"],
  ["report.png", "04 / Monthly report — readable print layout"],
];
const images = await Promise.all(
  frames.map(async ([file, label], index) => {
    const data = await readFile(new URL(`../docs/assets/${file}`, import.meta.url));
    return `<g class="frame f${index}"><text x="28" y="33" fill="#eff8f4" font-size="18" font-weight="700">${label}</text><image x="0" y="56" width="1280" height="800" href="data:image/png;base64,${data.toString("base64")}"/></g>`;
  }),
);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900" role="img" aria-labelledby="title desc"><title id="title">PhishGuard controlled UI demo</title><desc id="desc">Actual interface screenshots cycling through the website, dashboard, high-risk warning and report. All accounts and assessments are synthetic fixtures.</desc><style>text{font-family:Arial,Helvetica,sans-serif}.frame{opacity:0;animation:screen 16s steps(1,end) infinite}.f1{animation-delay:-12s}.f2{animation-delay:-8s}.f3{animation-delay:-4s}@keyframes screen{0%,24.99%{opacity:1}25%,100%{opacity:0}}@media(prefers-reduced-motion:reduce){.frame{animation:none;opacity:0}.f0{opacity:1}}</style><rect width="1280" height="900" fill="#071014"/>${images.join("")}<text x="28" y="884" fill="#b2c3ca" font-size="14">CONTROLLED DEMO · MOCK ACCOUNTS · SYNTHETIC ASSESSMENTS · NO LIVE THREATS</text></svg>`;
await writeFile(new URL("../docs/assets/demo.svg", import.meta.url), svg);
console.log("Created script-free animated demo from actual captured application screens.");
