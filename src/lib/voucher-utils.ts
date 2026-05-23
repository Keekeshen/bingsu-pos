/** Voucher discount for basket subtotal — before table service charge (matches POS CheckoutCart behaviour). */

export function computeVoucherDiscount(
  basketSubtotal: number,
  voucher: { discount_type: string; discount_value: number }
): number {
  const s = Math.max(0, basketSubtotal);
  if (voucher.discount_type === "fixed") {
    return Math.min(voucher.discount_value, s);
  }
  if (voucher.discount_type === "percentage") {
    return +(s * voucher.discount_value / 100).toFixed(2);
  }
  return 0;
}

export const TABLE_SERVICE_CHARGE_PCT = 10;

/** Bill for table dine-in — basket subtotal, optional voucher discount, then 10% service charge. No rounding applied. */
export function tableBillTotals(basketSubtotal: number, voucherDiscountRaw: number) {
  const d = Math.max(0, Math.min(+Number(voucherDiscountRaw).toFixed(2), basketSubtotal));
  const taxableSubtotal = +(basketSubtotal - d).toFixed(2);
  const serviceCharge = +(taxableSubtotal * TABLE_SERVICE_CHARGE_PCT / 100).toFixed(2);
  const total = +(taxableSubtotal + serviceCharge).toFixed(2);
  return {
    voucherDiscountApplied: d,
    taxableSubtotal,
    serviceCharge,
    rawTotal: total,
    total,
    rounding: 0,
  };
}

