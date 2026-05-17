const ESC = 0x1b;
const GS  = 0x1d;
export const PAPER_WIDTH = 32;

export class EscPos {
  private buf: number[] = [];

  init()      { return this.bytes([ESC, 0x40]); }
  cut()       { return this.bytes([GS,  0x56, 0x41, 0x10]); }
  feed(n = 3) { return this.bytes([ESC, 0x64, n]); }
  align(a: "left" | "center" | "right") {
    return this.bytes([ESC, 0x61, a === "left" ? 0 : a === "center" ? 1 : 2]);
  }
  bold(on: boolean)    { return this.bytes([ESC, 0x45, on ? 1 : 0]); }
  bigText(on: boolean) { return this.bytes([GS,  0x21, on ? 0x11 : 0x00]); }
  text(s: string) { return this.bytes(Array.from(new TextEncoder().encode(s))); }
  line(s = "")   { return this.text(s + "\n"); }
  dashes()       { return this.line("-".repeat(PAPER_WIDTH)); }
  row(label: string, value: string) {
    const gap = PAPER_WIDTH - label.length - value.length;
    return this.line(label + " ".repeat(Math.max(1, gap)) + value);
  }

  // ESC/POS native QR code (works on all ESC/POS thermal printers)
  qrCode(url: string) {
    const data = Array.from(new TextEncoder().encode(url));
    const len = data.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;
    // Model 2
    this.bytes([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    // Cell size 5
    this.bytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05]);
    // Error correction M
    this.bytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]);
    // Store data
    this.bytes([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...data]);
    // Print
    this.bytes([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
    return this;
  }

  private bytes(arr: number[]) { this.buf.push(...arr); return this; }
  build() { return new Uint8Array(this.buf); }
}

export type ThermalReceiptData = {
  orderNumber: string;
  date: string;
  tableNumber?: string;
  customerName?: string;
  items: { name: string; qty: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
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
  const seq = d.orderNumber.split("-").pop() ?? d.orderNumber;

  p.init();
  p.align("center").bigText(true).bold(true).line("Koori Dessert").bigText(false).bold(false);
  p.line("57, Jln SS 21/1a, Damansara Utama").line("47400 Petaling Jaya, Selangor");
  p.dashes();

  p.align("left");
  p.line(`Invoice: ${d.orderNumber}`);
  p.line(`Date   : ${d.date}`);
  p.line(`Cashier: Cashier`);
  if (d.tableNumber)  p.line(`Table  : ${d.tableNumber}`);
  if (d.customerName) p.line(`Cust   : ${d.customerName}`);
  p.line(`ORDER  : ${seq}`);
  p.dashes();

  p.bold(true).line("Qty  Item" + " ".repeat(W - 19) + "Price(MYR)").bold(false);
  p.dashes();

  for (const item of d.items) {
    const priceStr = item.subtotal.toFixed(2);
    const desc = `${item.qty}x ${item.name}`;
    const maxDesc = W - priceStr.length - 1;
    const t = desc.length > maxDesc ? desc.slice(0, maxDesc - 1) + "~" : desc;
    p.line(t + " ".repeat(W - t.length - priceStr.length) + priceStr);
    p.line(`   @ RM${item.unitPrice.toFixed(2)}/ea`);
  }
  p.dashes();

  p.row("Subtotal", `RM ${d.subtotal.toFixed(2)}`);
  if ((d.voucherDiscount ?? 0) > 0) p.row("Voucher", `-RM ${d.voucherDiscount!.toFixed(2)}`);
  if ((d.serviceCharge ?? 0) > 0)   p.row("Service charge(10%)", `RM ${d.serviceCharge!.toFixed(2)}`);
  if (d.rounding !== undefined && d.rounding !== 0)
    p.row("Bill rounding", `${d.rounding >= 0 ? "+" : ""}RM ${Math.abs(d.rounding).toFixed(2)}`);
  p.dashes();
  p.bold(true).row("TOTAL (MYR)", `RM ${d.total.toFixed(2)}`).bold(false);

  if (d.paymentMethod) {
    const paid = d.amountPaid ?? d.total;
    p.row(d.paymentMethod.toUpperCase(), `RM ${paid.toFixed(2)}`);
    if (d.paymentMethod.toLowerCase() === "cash") {
      const chg = +(paid - d.total).toFixed(2);
      if (chg >= 0) p.row("Change", `RM ${chg.toFixed(2)}`);
    }
  }

  if ((d.pointsEarned ?? 0) > 0) {
    p.dashes();
    p.align("center").line(`[+] ${d.pointsEarned} loyalty pts earned`);
  }

  p.dashes();
  p.align("center").line("Scan QR to rate your experience:");
  p.qrCode("https://bit.ly/4eNKmF7");
  p.line("").line("Thank you for visiting us!").line("We hope to see you again soon.");
  p.dashes();
  p.line("** OFFICIAL RECEIPT **").line("POWERED BY KOORI POS");
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
  if (d.tableNumber) {
    p.bigText(true).bold(true).line(`TABLE ${d.tableNumber}`).bigText(false).bold(false);
  } else {
    p.bold(true).line("COUNTER ORDER").bold(false);
  }
  p.dashes();
  p.align("left");
  p.line(`Order: ${d.orderNumber}`);
  p.line(`Time : ${d.date}`);
  p.dashes();
  for (const item of d.items) {
    p.bold(true).bigText(true).line(`${item.qty}x`).bigText(false).bold(false);
    p.line(`   ${item.name}`);
  }
  if (d.note) { p.dashes(); p.line(`Note: ${d.note}`); }
  p.dashes();
  p.feed(4).cut();
  return p.build();
}