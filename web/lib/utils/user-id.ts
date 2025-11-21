export type UserId = number;

export function normalizeUserId(value: unknown): UserId | null {
  if (value === null || value === undefined) {
    return null;
  }

  const num = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}
