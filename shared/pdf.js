import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { countRisks } from "./history.js";
export async function makeReport(log, user, month, now = new Date()) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.13, 0.18),
    muted = rgb(0.29, 0.33, 0.39),
    red = rgb(0.69, 0.07, 0.11);
  const width = 841.89,
    height = 595.28,
    margin = 40,
    bottom = 45;
  const latin = (text) => String(text ?? "").replace(/[^\x20-\x7e\u00a0-\u00ff]/g, "?");
  const title = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00`),
  );
  const counts = countRisks(log);
  let page, y;
  function line(text, x, top, size = 9, font = regular, color = ink) {
    page.drawText(latin(text), { x, y: height - top - size, size, font, color });
  }
  function wrap(text, font, size, maxWidth) {
    const words = latin(text).replace(/\s+/g, " ").split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
      // Split long URLs as well as ordinary words; preserve every printable character.
      let part = word;
      while (part.length && font.widthOfTextAtSize(part, size) > maxWidth) {
        let count = 1;
        while (
          count < part.length &&
          font.widthOfTextAtSize(part.slice(0, count + 1), size) <= maxWidth
        )
          count++;
        if (current) {
          lines.push(current);
          current = "";
        }
        lines.push(part.slice(0, count));
        part = part.slice(count);
      }
      const candidate = current ? current + " " + part : part;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = part;
      } else current = candidate;
    }
    if (current || !lines.length) lines.push(current);
    return lines;
  }
  const columns = [100, 235, 45, 62, 320];
  const heads = ["Date / time", "Website", "Score", "Risk", "Assessment"];
  function tableHead() {
    page.drawRectangle({
      x: margin,
      y: height - y - 24,
      width: width - 2 * margin,
      height: 24,
      color: rgb(0.14, 0.17, 0.22),
    });
    let x = margin;
    heads.forEach((label, i) => {
      line(label, x + 7, y + 7, 8, bold, rgb(1, 1, 1));
      x += columns[i];
    });
    y += 24;
  }
  function newPage(first = false) {
    page = doc.addPage([width, height]);
    y = first ? 225 : 55;
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: red });
    if (!first) line(`PhishGuard | Monthly report | ${title}`, margin, 24, 11, bold);
    tableHead();
  }
  newPage(true);
  line("PhishGuard", margin, 25, 24, bold);
  line("Monthly security report", margin, 57, 16, bold);
  line(`Reporting period: ${title}`, margin, 88, 10);
  const nameLines = wrap(
    `Owner: ${user.name} | Email: ${user.email}`,
    regular,
    9,
    width - 2 * margin,
  );
  nameLines.slice(0, 3).forEach((text, i) => line(text, margin, 105 + i * 12, 9));
  line(
    `Generated: ${now.toLocaleString()} | Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    margin,
    145,
    8,
    regular,
    muted,
  );
  page.drawRectangle({
    x: margin,
    y: height - 181,
    width: width - 2 * margin,
    height: 22,
    color: rgb(0.94, 0.95, 0.97),
  });
  line(
    `SCANS: ${log.length}        LOW: ${counts.LOW}        MEDIUM: ${counts.MEDIUM}        HIGH: ${counts.HIGH}`,
    margin + 8,
    166,
    10,
    bold,
  );
  line(
    "LOW 0-30 | MEDIUM 31-70 | HIGH 71-100. Heuristic indicators do not prove safety or phishing.",
    margin,
    190,
    8,
    regular,
    muted,
  );
  line(
    "Queries, fragments and credentials excluded. Local retained records only; deleted/expired records are unavailable.",
    margin,
    204,
    8,
    regular,
    muted,
  );
  const rows = log.length
    ? [...log]
        .reverse()
        .map((row) => [
          new Date(row.timestamp).toLocaleString(),
          row.url,
          `${row.score}/100`,
          row.threatLevel,
          row.reasons.join("; ") || "No indicators detected",
        ])
    : [["-", "No scans recorded for this month", "-", "-", "-"]];
  rows.forEach((values, index) => {
    const wrapped = values.map((value, i) => wrap(value, regular, 8, columns[i] - 14));
    const rowHeight = Math.max(26, ...wrapped.map((lines) => lines.length * 11 + 12));
    if (y + rowHeight > height - bottom) newPage();
    page.drawRectangle({
      x: margin,
      y: height - y - rowHeight,
      width: width - 2 * margin,
      height: rowHeight,
      color: index % 2 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.91),
      borderWidth: 0.35,
    });
    let x = margin;
    wrapped.forEach((lines, i) => {
      const color =
        i === 3
          ? values[3] === "HIGH"
            ? red
            : values[3] === "MEDIUM"
              ? rgb(0.48, 0.29, 0)
              : rgb(0.14, 0.36, 0.23)
          : ink;
      lines.forEach((text, n) =>
        line(text, x + 7, y + 6 + n * 11, 8, i === 3 ? bold : regular, color),
      );
      x += columns[i];
    });
    y += rowHeight;
  });
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    page = p;
    line(
      "PhishGuard | Private local report | Rule engine 4.1.0",
      margin,
      height - 25,
      8,
      regular,
      muted,
    );
    line(`Page ${i + 1} of ${pages.length}`, width - 100, height - 25, 8, regular, muted);
  });
  doc.setTitle(`PhishGuard Monthly Report - ${title}`);
  doc.setAuthor("PhishGuard");
  doc.setCreationDate(now);
  return { bytes: await doc.save(), pageCount: pages.length };
}
