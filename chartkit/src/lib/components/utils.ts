export function asNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function asString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export type DeltaStatus = "positive" | "negative" | "neutral";

export function getDeltaStatus(
  value: number,
  neutralMin = 0,
  neutralMax = 0,
): DeltaStatus {
  if (value > neutralMax) {
    return "positive";
  }
  if (value < neutralMin) {
    return "negative";
  }
  return "neutral";
}

export function deltaSymbol(status: DeltaStatus): string {
  if (status === "positive") {
    return "▲";
  }
  if (status === "negative") {
    return "▼";
  }
  return "—";
}
