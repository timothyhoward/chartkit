export type ChartKitFmt = string | undefined;

const LOCALE = "en-AU";

function parseDecimals(fmt: string, prefix: string): number | null {
  if (!fmt.startsWith(prefix)) {
    return null;
  }
  const raw = fmt.slice(prefix.length);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    return null;
  }
  return parsed;
}

function parseCurrencyToken(
  fmt: string,
): { currency: "AUD" | "USD"; decimals: number } | null {
  const lowered = fmt.toLowerCase();
  const match = lowered.match(/^(aud|usd)(\d+)?$/);
  if (!match) {
    return null;
  }
  const currency = match[1] === "aud" ? "AUD" : "USD";
  const decimals = match[2] ? Number(match[2]) : 2;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    return null;
  }
  return { currency, decimals };
}

function parseCurrencyThousandsToken(
  fmt: string,
): { currency: "AUD" | "USD"; decimals: number } | null {
  const lowered = fmt.toLowerCase();
  const match = lowered.match(/^(aud|usd)(\d+)?k$/);
  if (!match) {
    return null;
  }
  const currency = match[1] === "aud" ? "AUD" : "USD";
  const decimals = match[2] ? Number(match[2]) : 1;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    return null;
  }
  return { currency, decimals };
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number, currency: "AUD" | "USD", decimals: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatChartKitNumber(value: number, fmt?: ChartKitFmt): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (!fmt) {
    return formatCompactNumber(value);
  }

  if (fmt === "currency_usd_bn") {
    return `US$${value.toFixed(1)}B`;
  }
  if (fmt === "currency_usd_m") {
    return `US$${value.toLocaleString(LOCALE, { maximumFractionDigits: 0 })}M`;
  }
  if (fmt === "currency_aud_bn") {
    return `A$${value.toFixed(1)}B`;
  }
  if (fmt === "currency_aud_m") {
    return `A$${value.toLocaleString(LOCALE, { maximumFractionDigits: 0 })}M`;
  }
  if (fmt === "usd") {
    return formatCurrency(value, "USD", 2);
  }
  if (fmt === "aud") {
    return formatCurrency(value, "AUD", 2);
  }
  if (fmt === "percent") {
    return `${value.toFixed(1)}%`;
  }

  const pctDecimals = parseDecimals(fmt, "pct");
  if (pctDecimals !== null) {
    return `${value.toFixed(pctDecimals)}%`;
  }

  const numDecimals = parseDecimals(fmt, "num");
  if (numDecimals !== null) {
    return value.toLocaleString(LOCALE, {
      minimumFractionDigits: numDecimals,
      maximumFractionDigits: numDecimals,
    });
  }

  const audDecimals = parseDecimals(fmt, "aud");
  if (audDecimals !== null) {
    return formatCurrency(value, "AUD", audDecimals);
  }

  const usdDecimals = parseDecimals(fmt, "usd");
  if (usdDecimals !== null) {
    return formatCurrency(value, "USD", usdDecimals);
  }

  const currencyThousandsToken = parseCurrencyThousandsToken(fmt);
  if (currencyThousandsToken) {
    const symbol = currencyThousandsToken.currency === "AUD" ? "A$" : "US$";
    const scaled = value / 1_000;
    return `${symbol}${scaled.toLocaleString(LOCALE, {
      minimumFractionDigits: currencyThousandsToken.decimals,
      maximumFractionDigits: currencyThousandsToken.decimals,
    })}K`;
  }

  const currencyToken = parseCurrencyToken(fmt);
  if (currencyToken) {
    return formatCurrency(value, currencyToken.currency, currencyToken.decimals);
  }

  return value.toLocaleString(LOCALE);
}

export function formatChartKitDisplayValue(value: unknown, fmt?: ChartKitFmt): string {
  if (value === null || value === undefined) {
    return "\u2013";
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return formatChartKitNumber(Number(value), fmt);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && value.trim() !== "") {
      return formatChartKitNumber(parsed, fmt);
    }
    return value;
  }
  return String(value);
}
