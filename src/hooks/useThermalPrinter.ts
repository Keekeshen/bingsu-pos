"use client";

import { useRef, useState, useCallback } from "react";

type BluetoothCharLike = {
  writeValueWithoutResponse?: (v: BufferSource) => Promise<void>;
  writeValue?: (v: BufferSource) => Promise<void>;
};
type SerialPortLike = {
  open: (o: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  writable: WritableStream<Uint8Array>;
};

// Common Bluetooth thermal printer service/characteristic pairs
const BT_PROFILES = [
  { svc: "0000ff00-0000-1000-8000-00805f9b34fb", ch: "0000ff02-0000-1000-8000-00805f9b34fb" },
  { svc: "49535343-fe7d-4ae5-8fa9-9fafd205e455", ch: "49535343-8841-43f4-a8d4-ecbe34729bb3" },
  { svc: "000018f0-0000-1000-8000-00805f9b34fb", ch: "00002af1-0000-1000-8000-00805f9b34fb" },
];

export function useThermalPrinter() {
  const btCharRef   = useRef<BluetoothCharLike | null>(null);
  const serialRef   = useRef<SerialPortLike | null>(null);
  const [connected, setConnected]   = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [method, setMethod]         = useState<"bt" | "serial" | null>(null);

  const hasBt     = typeof navigator !== "undefined" && "bluetooth" in navigator;
  const hasSerial = typeof navigator !== "undefined" && "serial" in navigator;

  const connect = useCallback(async (): Promise<boolean> => {
    setConnecting(true);
    try {
      // ── Bluetooth (Android Chrome + desktop Chrome) ──
      if (hasBt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any;
        const optionalServices = BT_PROFILES.map(p => p.svc);
        const device = await nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices,
        });
        const server = await device.gatt.connect();

        let found: BluetoothCharLike | null = null;
        for (const { svc, ch } of BT_PROFILES) {
          try {
            const service = await server.getPrimaryService(svc);
            found = await service.getCharacteristic(ch);
            break;
          } catch { /* try next */ }
        }
        if (!found) throw new Error("No compatible service found on this printer.");

        btCharRef.current = found;
        setMethod("bt");
        setConnected(true);
        return true;
      }

      // ── Web Serial (desktop Chrome/Edge) ──
      if (hasSerial) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const port: SerialPortLike = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        serialRef.current = port;
        setMethod("serial");
        setConnected(true);
        return true;
      }

      alert("No printer API available.\nAndroid: use Chrome browser.\nDesktop: use Chrome or Edge.");
      return false;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection cancelled";
      if (!msg.includes("cancelled") && !msg.includes("chosen")) {
        alert(`Could not connect: ${msg}`);
      }
      setConnected(false);
      return false;
    } finally {
      setConnecting(false);
    }
  }, [hasBt, hasSerial]);

  const disconnect = useCallback(async () => {
    try {
      if (serialRef.current) await serialRef.current.close();
    } catch { /* ignore */ }
    btCharRef.current = null;
    serialRef.current = null;
    setConnected(false);
    setMethod(null);
  }, []);

  const print = useCallback(async (data: Uint8Array): Promise<boolean> => {
    // ── Bluetooth ──
    if (method === "bt" && btCharRef.current) {
      const ch = btCharRef.current;
      const CHUNK = 100;
      try {
        for (let i = 0; i < data.length; i += CHUNK) {
          const chunk = data.slice(i, i + CHUNK);
          if (ch.writeValueWithoutResponse) {
            await ch.writeValueWithoutResponse(chunk);
          } else if (ch.writeValue) {
            await ch.writeValue(chunk);
          }
          await new Promise(r => setTimeout(r, 30));
        }
        return true;
      } catch {
        setConnected(false);
        btCharRef.current = null;
        return false;
      }
    }

    // ── Serial ──
    if (method === "serial" && serialRef.current) {
      try {
        const writer = serialRef.current.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        return true;
      } catch {
        setConnected(false);
        serialRef.current = null;
        return false;
      }
    }

    return false;
  }, [method]);

  return { connected, connecting, method, connect, disconnect, print };
}