// ESC/POS thermal printer utility (58mm paper, ~32 chars wide)
const ESC = 0x1b;
const GS  = 0x1d;

export const PAPER_WIDTH = 32;

export class EscPos {
  private buf: number[] = [];

  init()   { return this.bytes([ESC, 0x40]); }
  cut()    { return this.bytes([GS,  0x56, 0x41, 0x10]); }
  feed(n = 3) { return this.bytes([ESC, 0x64, n]); }

  align(a: "left" | "center" | "right") {
    return this.bytes([ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2]);
  }

  bold(on: boolean) { return this.bytes([ESC, 0x45, on ? 1 : 0]); }
  bigText(on: boolean) { return this.bytes([GS, 0x21, on ? 0x11 : 0x00]); }

  text(s: string) {
    const enc = new TextEncoder();
    return this.bytes(Array.from(enc.encode(s)));
  }

  line(s = "") { return this.text(s + "\n"); }
  dashes() { return this.line("-".repeat(PAPER_WIDTH)); }

  row(label: string, value: string) {
    const gap = PAPER_WIDTH - label.length - value.length;
    return this.line(label + " ".repeat(Math.max(1, gap)) + value);
  }

  qrCode(url: string) {
    const data = Array.from(new TextEncoder().encode(url));
    const len = data.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;
    this.bytes([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    this.bytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05]);
    this.bytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]);
    this.bytes([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...data]);
    this.bytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
    return this;
  }

  private bytes(arr: number[]) { this.buf.push(...arr); return this; }
  build() { return new Uint8Array(this.buf); }
}

export type ThermalReceiptData = {
  orderNumber: string;
  date: string;
  cashier?: string;
  tableNumber?: string;
  customerName?: string;
  notes?: string;
  items: { name: string; qty: number; unitPrice: number; subtotal: number; discountPct?: number }[];
  subtotal: number;
  tierDiscount?: number;
  tierLabel?: string;
  voucherDiscount?: number;
  serviceCharge?: number;
  rounding?: number;
  total: number;
  paymentMethod?: string;
  amountPaid?: number;
  pointsEarned?: number;
};

export function buildReceiptBytes(d: ThermalReceiptData): Uint8Array {
  const p = new EscPos();
  const W = PAPER_WIDTH;
  const parts = d.orderNumber.split("-");
  const seq = parts[parts.length - 1] ?? d.orderNumber;
  p.init();

  // Header
  p.align("center").bigText(true).bold(true).line("Koori Dessert").bigText(false).bold(false);
  p.line("");
  p.line("SSM : 003834965-W");
  p.line("57, Jln SS 21/1a,");
  p.line("Damansara Utama, 47400 PJ");
  p.dashes();

  p.align("left");
  p.line("Invoice: " + d.orderNumber);
  p.line("Date   : " + d.date);
  p.line("Cashier: " + (d.cashier ?? "Cashier"));
  if (d.tableNumber) p.line("Table  : " + d.tableNumber);
  if (d.customerName) p.line("Customer: " + d.customerName);
  p.line("ORDER  : " + seq);
  p.dashes();

  p.bold(true).line("Qty  Item" + " ".repeat(W - 9 - 10) + "Price(MYR)").bold(false);
  p.dashes();

  for (const item of d.items) {
    const priceStr = item.subtotal.toFixed(2);
    const desc = item.qty + "x " + item.name;
    const maxDesc = W - priceStr.length - 1;
    const descTrunc = desc.length > maxDesc ? desc.slice(0, maxDesc - 1) + "~" : desc;
    p.line(descTrunc + " ".repeat(W - descTrunc.length - priceStr.length) + priceStr);
    if (item.discountPct && item.discountPct > 0) {
      const discAmt = +(item.unitPrice - item.subtotal / item.qty).toFixed(2);
      const pctDisplay = Number.isInteger(item.discountPct)
        ? String(item.discountPct)
        : item.discountPct.toFixed(1);
      p.line("   @ RM" + item.unitPrice.toFixed(2) + "/ea (-RM" + discAmt.toFixed(2) + " / " + pctDisplay + "%)");
    } else {
      p.line("   @ RM" + item.unitPrice.toFixed(2) + "/ea");
    }
  }
  if (d.notes) {
    p.dashes();
    p.align("left").line("Remark: " + d.notes);
  }
  p.dashes();

  p.row("Subtotal", "RM " + d.subtotal.toFixed(2));
  if (d.tierDiscount && d.tierDiscount > 0) p.row("Member (" + (d.tierLabel ?? "") + ")", "-RM " + d.tierDiscount.toFixed(2));
  if (d.voucherDiscount && d.voucherDiscount > 0) p.row("Voucher discount", "-RM " + d.voucherDiscount.toFixed(2));
  if (d.serviceCharge && d.serviceCharge > 0) p.row("Service charge (10%)", "RM " + d.serviceCharge.toFixed(2));
  if (d.rounding != null && d.rounding !== 0) p.row("Bill rounding", (d.rounding > 0 ? "+" : "") + "RM " + d.rounding.toFixed(2));

  p.dashes();
  p.bold(true).row("TOTAL (MYR)", "RM " + d.total.toFixed(2)).bold(false);

  if (d.paymentMethod) {
    p.row(d.paymentMethod.toUpperCase(), "RM " + (d.amountPaid ?? d.total).toFixed(2));
    if (d.paymentMethod.toLowerCase() === "cash" && d.amountPaid != null) {
      const change = +(d.amountPaid - d.total).toFixed(2);
      if (change >= 0) p.row("Change", "RM " + change.toFixed(2));
    }
  }

  if (d.pointsEarned && d.pointsEarned > 0) {
    p.dashes();
    p.align("center").line("[+] " + d.pointsEarned + " loyalty points earned");
  }

  p.dashes();
  p.align("center");
  p.line("Scan QR to rate your experience:");
  p.qrCode("https://bit.ly/4eNKmF7");
  p.line("");
  p.line("Thank you for visiting us!");
  p.line("We hope to see you again soon.");
  p.dashes();
  p.line("** OFFICIAL RECEIPT **");
  p.line("POWERED BY KOORI POS");
  p.feed(4).cut();
  return p.build();
}

export type KitchenOrderData = {
  orderNumber: string;
  date: string;
  tableNumber?: string;
  items: { name: string; qty: number }[];
  note?: string;
};

export function buildKitchenOrderBytes(d: KitchenOrderData): Uint8Array {
  const p = new EscPos();
  p.init();

  p.align("center").bold(true).bigText(true).line("KITCHEN").bigText(false).bold(false);
  p.align("center").line(d.orderNumber).line(d.date);
  p.dashes();

  if (d.tableNumber) {
    p.align("center");
    p.line("================================");
    p.bold(true).line("TABLE NUMBER:").bold(false);
    p.bigText(true).bold(true).line("    " + d.tableNumber + "    ").bigText(false).bold(false);
    p.line("================================");
  } else {
    p.align("center").bold(true).bigText(true).line("COUNTER").bigText(false).bold(false);
  }

  p.dashes();
  p.align("left");

  for (const item of d.items) {
    p.bigText(true).bold(true).line(item.qty + "x").bigText(false);
    p.line("   " + item.name).bold(false);
    p.feed(1);
  }

  if (d.note) {
    p.dashes();
    p.align("center").bold(true).line("NOTE:").bold(false);
    p.align("left").line(d.note);
  }

  p.dashes();
  p.feed(4).cut();
  return p.build();
}