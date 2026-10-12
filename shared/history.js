export const MAX_REPORT_ENTRIES = 5000;
export function historyKey(userId) {
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(userId || "")) throw new Error("Invalid history owner");
  return `history:${userId}`;
}
export function appendHistory(previous, result, now = Date.now()) {
  const cutoff = now - 366 * 86400000;
  const log = (Array.isArray(previous) ? previous : []).filter(row => Number.isFinite(Date.parse(row.timestamp)) && Date.parse(row.timestamp) >= cutoff);
  // Same document updates replace its assessment instead of inflating scan totals.
  const index = log.findIndex(row => row.scanId === result.scanId);
  if (index >= 0) log[index] = result; else log.push(result);
  return log.slice(-MAX_REPORT_ENTRIES);
}
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export function selectMonth(log, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid reporting month");
  return log.filter(row => { const date = new Date(row.timestamp); return !Number.isNaN(date.getTime()) && monthKey(date) === month; });
}
export function countRisks(log) {
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const row of log) if (Object.hasOwn(counts, row.threatLevel)) counts[row.threatLevel]++;
  return counts;
}
