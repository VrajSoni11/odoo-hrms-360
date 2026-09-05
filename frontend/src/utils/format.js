// Shared number formatting helpers so amounts look consistent (and align
// cleanly in tables) everywhere in the app: thousands separators + always
// 2 decimal places, e.g. 100000 -> "100,000.00".
export function formatMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
