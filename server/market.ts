import WebSocket from "ws";
import type { Response } from "express";
import type { MarketPrice } from "./types.js";

export const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", "LINK", "LTC"];
const products = SYMBOLS.map((symbol) => `${symbol}USDT`);
const streams = products.flatMap((pair) => [`${pair.toLowerCase()}@trade`, `${pair.toLowerCase()}@ticker`]);
const endpoint = `wss://data-stream.binance.vision/stream?streams=${streams.join("/")}`;
const prices = new Map<string, MarketPrice>();
const daily = new Map<string, { open: number | null; change: number | null }>();
const clients = new Set<Response>();
const lastPublished = new Map<string, number>();
const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; price: MarketPrice }>();
let socket: WebSocket | null = null;
let status: "connecting" | "live" | "reconnecting" = "connecting";
let retryCount = 0;
let lastMessageAt: string | null = null;

function publish(event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try { client.write(message); }
    catch { clients.delete(client); }
  }
}

function emitPrice(value: MarketPrice) {
  prices.set(value.symbol, value);
  lastMessageAt = value.receivedAt;
  if (prices.size === SYMBOLS.length) status = "live";
  const now = Date.now();
  const wait = Math.max(0, 250 - (now - (lastPublished.get(value.symbol) ?? 0)));
  const queued = pending.get(value.symbol);
  if (queued) { queued.price = value; return; }
  if (!wait) { lastPublished.set(value.symbol, now); publish("price", value); return; }
  const item = { price: value, timer: setTimeout(() => {
    pending.delete(value.symbol);
    lastPublished.set(value.symbol, Date.now());
    publish("price", item.price);
  }, wait) };
  pending.set(value.symbol, item);
}

export function marketSnapshot() {
  const now = Date.now();
  const age = lastMessageAt ? now - Date.parse(lastMessageAt) : Infinity;
  const fresh = SYMBOLS.filter(symbol => {
    const price = prices.get(symbol);
    return price && now - Date.parse(price.receivedAt) < 30000;
  }).length;
  const health = status === "live" && age > 15000 ? "stale" : status === "live" && fresh < SYMBOLS.length ? "partial" : status;
  return { prices: SYMBOLS.map(symbol => prices.get(symbol)).filter(Boolean), status: health,
    source: "Binance Spot / USDT", quoteAsset: "USDT", lastMessageAt, expectedSymbols: SYMBOLS, freshSymbols: fresh };
}

export function addMarketClient(res: Response) {
  clients.add(res);
  res.write(`event: snapshot\ndata: ${JSON.stringify(marketSnapshot())}\n\n`);
  const interval = setInterval(() => {
    try { res.write(`event: health\ndata: ${JSON.stringify(marketSnapshot())}\n\n`); }
    catch { clearInterval(interval); clients.delete(res); }
  }, 8000);
  res.on("close", () => { clearInterval(interval); clients.delete(res); });
}

export function startMarketStream() {
  if (process.env.DISABLE_MARKET_STREAM === "1") return;
  const connect = () => {
    status = retryCount ? "reconnecting" : "connecting";
    publish("health", marketSnapshot());
    socket = new WebSocket(endpoint, { handshakeTimeout: 10000 });
    let settled = false;
    socket.on("open", () => {
      retryCount = 0;
      status = "connecting";
      publish("health", marketSnapshot());
    });
    socket.on("message", (raw) => {
      try {
        const outer = JSON.parse(raw.toString()) as { data?: Record<string, unknown> };
        const event = outer.data;
        if (!event || typeof event.s !== "string" || !products.includes(event.s)) return;
        const symbol = event.s.replace(/USDT$/, "");
        if (event.e === "24hrTicker") {
          const open = Number(event.o);
          const change = Number(event.P);
          daily.set(symbol, { open: Number.isFinite(open) && open > 0 ? open : null, change: Number.isFinite(change) ? change : null });
          if (!prices.has(symbol)) {
            const last = Number(event.c);
            if (Number.isFinite(last) && last > 0) emitPrice({ symbol, productId: `${symbol}/USDT`, price: last,
              open24h: Number.isFinite(open) && open > 0 ? open : null,
              change24h: Number.isFinite(change) ? change : null,
              eventTime: new Date(Number(event.E)).toISOString(), receivedAt: new Date().toISOString(), source: "Binance Spot / USDT" });
          }
          return;
        }
        if (event.e !== "trade") return;
        const price = Number(event.p);
        const eventTime = Number(event.T);
        if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(eventTime)) return;
        const stats = daily.get(symbol);
        emitPrice({ symbol, productId: `${symbol}/USDT`, price, open24h: stats?.open ?? null,
          change24h: stats?.change ?? null, eventTime: new Date(eventTime).toISOString(),
          receivedAt: new Date().toISOString(), source: "Binance Spot / USDT" });
      } catch { /* Malformed external messages are not represented as market prices. */ }
    });
    const reconnect = () => {
      if (settled) return;
      settled = true;
      status = "reconnecting";
      publish("health", marketSnapshot());
      const delay = Math.min(30000, 1200 * 2 ** Math.min(retryCount++, 5));
      setTimeout(connect, delay);
    };
    socket.on("close", reconnect);
    socket.on("error", reconnect);
  };
  connect();
}
