export function coerceMoneyToCents(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100);
  }
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [integerPart, fractionPart = ""] = raw.split(".");
  const cents =
    Number(integerPart) * 100 +
    Number((fractionPart + "00").slice(0, 2));
  return Number.isFinite(cents) ? cents : null;
}

export function formatCentsToMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  if (!Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2);
}

