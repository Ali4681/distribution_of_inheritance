export const CURRENCY = "ل.س";
export const CURRENCY_FULL = "ليرة سورية";
export const CURRENCY_CODE = "SYP";

export function formatMoney(value: number): string {
  return `${value.toLocaleString("en-US-u-nu-latn")} ${CURRENCY}`;
}
