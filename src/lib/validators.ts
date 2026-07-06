// Tiny manual validators — keep zero extra deps.

export function str(v: FormDataEntryValue | null, opts: { min?: number; max?: number; required?: boolean } = {}) {
  const s = typeof v === "string" ? v.trim() : "";
  if (opts.required && s.length === 0) throw new Error("required");
  if (opts.min !== undefined && s.length < opts.min) throw new Error(`min ${opts.min}`);
  if (opts.max !== undefined && s.length > opts.max) throw new Error(`max ${opts.max}`);
  return s;
}

export function optStr(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? null : s;
}

export function int(v: FormDataEntryValue | null, opts: { min?: number; max?: number; required?: boolean } = {}) {
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "") {
    if (opts.required) throw new Error("required");
    return null;
  }
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error("must be integer");
  if (opts.min !== undefined && n < opts.min) throw new Error(`min ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw new Error(`max ${opts.max}`);
  return n;
}

export function email(v: FormDataEntryValue | null) {
  const s = str(v, { required: true, max: 200 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error("invalid email");
  return s;
}

export function enumVal<T extends string>(v: FormDataEntryValue | null, allowed: readonly T[], required = true): T | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) {
    if (required) throw new Error("required");
    return null;
  }
  if (!allowed.includes(s as T)) throw new Error(`invalid value`);
  return s as T;
}

export function date(v: FormDataEntryValue | null, required = false): Date | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) {
    if (required) throw new Error("required");
    return null;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error("invalid date");
  return d;
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

/** Compact millions display, e.g. 5_000_000 → "₹5M", 24_900_000 → "₹24.9M", 450_000 → "₹0.45M". */
export function formatM(n: number) {
  const sign = n < 0 ? "-" : "";
  const m = Math.abs(n) / 1_000_000;
  const s = m.toFixed(2).replace(/\.?0+$/, ""); // trim trailing zeros ("5.00"→"5", "24.90"→"24.9")
  return `${sign}₹${s}M`;
}

export function tierFromBasePrice(base: number): "A" | "B" | "C" {
  if (base >= 500_000) return "A";
  if (base >= 200_000) return "B";
  return "C";
}
