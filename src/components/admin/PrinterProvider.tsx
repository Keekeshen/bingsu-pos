"use client";

import { createContext, useContext, ReactNode } from "react";
import { useThermalPrinter } from "@/hooks/useThermalPrinter";

type PrinterCtx = {
  counter: ReturnType<typeof useThermalPrinter>;
  kitchen: ReturnType<typeof useThermalPrinter>;
};

const Ctx = createContext<PrinterCtx | null>(null);

export function PrinterProvider({ children }: { children: ReactNode }) {
  const counter = useThermalPrinter();
  const kitchen = useThermalPrinter();
  return <Ctx.Provider value={{ counter, kitchen }}>{children}</Ctx.Provider>;
}

export function usePrinter() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrinter must be inside PrinterProvider");
  return ctx;
}