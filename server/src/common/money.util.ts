/**
 * 金额工具：所有金额计算一律使用「整数分」，避免 JS 浮点精度误差。
 *
 * 存储层 MySQL DECIMAL 为精确十进制，不参与浮点运算；
 * 因此仅在 JS 侧把元转成整数分计算，入库/出参时再转回元即可。
 */

/** 元 → 分（四舍五入到整数分，兼容 number 与 "39.9" 这类字符串） */
export function yuanToCents(yuan: number | string): number {
  return Math.round(Number(yuan) * 100);
}

/** 分 → 元（用于入库/响应，2 位小数） */
export function centsToYuan(cents: number): number {
  return Math.round(cents) / 100;
}

/** 金额四舍五入到分（对外兼容，内部计算请走整数分） */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 折扣（10 倍百分比，如 8.8 折 → 88）计算抵扣金额。
 * 例：8.8 折 = 打 8.8 折，抵扣 12%：amountCents * (10 - 8.8) / 10。
 * 先按 10 倍百分比四舍五入成整数（8.8 → 88），再全程整数分计算。
 */
export function percentOffCents(
  amountCents: number,
  discount10x: number,
): number {
  if (discount10x <= 0) return amountCents;
  if (discount10x >= 10) return 0;
  const percent = Math.round(discount10x * 10); // 88（表示支付 88%）
  return Math.round((amountCents * (100 - percent)) / 100);
}
