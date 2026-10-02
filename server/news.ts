import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { classifyNews } from "./ai.js";

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string;
  retrievedAt: string;
  excerpt: string;
  stance?: string;
  scope?: string;
  rationale?: string;
}

type Cache = { at: number; items: NewsItem[]; error: string | null };
const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
const caches = new Map<string, Cache>();
const publisherFeeds = [
  { publisher: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { publisher: "Decrypt", url: "https://decrypt.co/feed" },
  {
    publisher: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  },
];

function clean(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scope(title: string): string {
  return /\b(bitcoin|btc|ethereum|eth|solana|sol|xrp|doge|bnb|cardano|ada|avalanche|avax|chainlink|link|litecoin|ltc)\b/i.test(
    title,
  )
    ? "Coin specific"
    : "Broad market";
}

async function readFeed(url: string, publisher?: string): Promise<NewsItem[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "LumenArc/1.0 Source Discovery" },
    signal: AbortSignal.timeout(13000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const parsed = parser.parse(await response.text()) as {
    rss?: { channel?: { item?: unknown[] | unknown } };
  };
  const raw = parsed.rss?.channel?.item;
  const entries = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (!entries.length) throw new Error("Empty feed");
  const items: NewsItem[] = [];
  for (const entry of entries.slice(0, 25)) {
    const item = entry as Record<string, unknown>;
    const title = clean(String(item.title ?? ""));
    const link = String(item.link ?? "");
    if (!title || !/^https:\/\//.test(link)) continue;
    const source = item.source as Record<string, unknown> | string | undefined;
    const sourceName =
      publisher ||
      (typeof source === "object" && source
        ? clean(String(source["#text"] ?? "Publisher"))
        : typeof source === "string"
          ? clean(source)
          : "Publisher");
    const timestamp = Date.parse(String(item.pubDate ?? ""));
    if (
      !Number.isFinite(timestamp) ||
      timestamp > Date.now() + 3600000 ||
      timestamp < Date.now() - 72 * 3600000
    )
      continue;
    const excerpt = clean(String(item.description ?? "")).slice(0, 600);
    items.push({
      id: createHash("sha256").update(link).digest("hex").slice(0, 20),
      title,
      publisher: sourceName,
      url: link,
      publishedAt: new Date(timestamp).toISOString(),
      retrievedAt: new Date().toISOString(),
      excerpt,
      scope: scope(title),
    });
  }
  return items;
}

export async function fetchNews(force = false, query = ""): Promise<Cache> {
  const term = query.trim().slice(0, 80);
  const key = term.toLowerCase() || "default";
  const cached = caches.get(key);
  if (!force && cached && Date.now() - cached.at < 90000) return cached;
  const searchTerms = term
    ? `cryptocurrency ${term} when:2d`
    : "(cryptocurrency OR blockchain OR bitcoin) (regulation OR ETF OR exchange OR market) when:2d";
  const googleUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerms)}&hl=en-US&gl=US&ceid=US:en`;
  const sources = term
    ? [{ publisher: "", url: googleUrl }]
    : [...publisherFeeds, { publisher: "", url: googleUrl }];
  const results = await Promise.allSettled(
    sources.map((feed) => readFeed(feed.url, feed.publisher || undefined)),
  );
  const errors: string[] = [];
  const combined: NewsItem[] = [];
  results.forEach((result, index) =>
    result.status === "fulfilled"
      ? combined.push(...result.value)
      : errors.push(
          `${sources[index].publisher || "Search"}: ${result.reason instanceof Error ? result.reason.message : "Unavailable"}`,
        ),
  );
  const keys = new Set<string>();
  const items = combined
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter((item) => {
      const titleKey = item.title
        .toLowerCase()
        .replace(/\s+-\s+[^-]+$/, "")
        .trim();
      if (keys.has(titleKey)) return false;
      keys.add(titleKey);
      return true;
    })
    .slice(0, 45);
  const value = {
    at: Date.now(),
    items,
    error: errors.length ? errors.join(", ") : null,
  };
  caches.set(key, value);
  if (caches.size > 16) caches.delete(caches.keys().next().value!);
  return value;
}

export async function analyzeNews(id: string): Promise<NewsItem> {
  const item = [...caches.values()]
    .flatMap((cache) => cache.items)
    .find((entry) => entry.id === id);
  if (!item)
    throw new Error(
      "News item is not available. Refresh the live search first.",
    );
  const result = await classifyNews(item.title, item.excerpt);
  Object.assign(item, result);
  return item;
}
