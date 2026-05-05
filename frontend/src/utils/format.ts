import { Locale } from "@/lib/i18n";

const latinDigitLocales: Record<Locale, string> = {
  en: "en-US-u-nu-latn",
  ar: "ar-SY-u-nu-latn",
};

export function formatNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat("en-US-u-nu-latn", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

export function formatMoney(
  value: number | string | null | undefined,
  currency = "SYP",
  locale: Locale = "en",
) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat(latinDigitLocales[locale], {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0) + ` ${currency}`;
}

export function formatDate(value: string | Date | null | undefined, locale: Locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(latinDigitLocales[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function percentage(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return `${Number.isFinite(numeric) ? numeric.toFixed(4) : "0.0000"}%`;
}
