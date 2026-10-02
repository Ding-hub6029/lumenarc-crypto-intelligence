#!/usr/bin/env node
/**
 * Download Binance Research Monthly Market Insights reports with bounded
 * concurrency and create a reproducible source manifest. The source PDFs are
 * intentionally written beneath data/source_pdfs, which is ignored by Git.
 *
 * Usage:
 *   node scripts/import_corpus.mjs
 *   node scripts/import_corpus.mjs --start=2024-03 --end=2026-09 --exclude=2024-12 --limit=30
 *   node scripts/import_corpus.mjs --refresh
 *   node scripts/import_corpus.mjs --concurrency=5
 *
 * The downloader accepts only an HTTP 2xx response whose first four bytes are
 * the PDF magic number %PDF. It never scrapes an authenticated area and makes
 * one ordinary GET request per candidate public static URL.
 */
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const dataDir = join(root, "data");
const pdfDir = join(dataDir, "source_pdfs");
const extractDir = join(dataDir, "extracted_text");
const manifestPath = join(dataDir, "manifest.csv");
const baseUrl = "https://public.bnbstatic.com/static/files/research";

function arg(name, fallback) {
  const v = process.argv.find((x) => x.startsWith(`--${name}=`));
  return v ? v.slice(name.length + 3) : fallback;
}
const start = arg("start", "2024-03");
const end = arg("end", "2026-09");
const limit = Number(arg("limit", "30"));
const concurrency = Math.max(1, Math.min(8, Number(arg("concurrency", "5"))));
const refresh = process.argv.includes("--refresh");
const excludedMonths = new Set(
  arg("exclude", "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean),
);
if (
  !/^\d{4}-\d{2}$/.test(start) ||
  !/^\d{4}-\d{2}$/.test(end) ||
  !Number.isInteger(limit) ||
  limit < 1
) {
  throw new Error("Use valid YYYY-MM start/end and a positive integer limit.");
}

function monthsInclusive(a, b) {
  const [ay, am] = a.split("-").map(Number),
    [by, bm] = b.split("-").map(Number);
  const out = [];
  for (let y = ay, m = am; y < by || (y === by && m <= bm); ) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (++m === 13) {
      y++;
      m = 1;
    }
  }
  return out;
}
function esc(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}
function csvRow(obj) {
  return [
    "report_month",
    "source_url",
    "local_pdf",
    "sha256",
    "page_count",
    "report_date",
    "title",
    "access_status",
    "http_status",
    "notes",
  ]
    .map((k) => esc(obj[k] ?? ""))
    .join(",");
}
function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      n = text[i + 1];
    if (quoted) {
      if (c === '"' && n === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return new Map(
    body
      .filter((r) => r.length >= 1 && r[0])
      .map((r) => [
        r[0],
        Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])),
      ]),
  );
}
function command(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(stdout)
        : reject(new Error(`${cmd} failed (${code}): ${stderr.trim()}`)),
    );
  });
}
async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "lumenarc-research-corpus/1.0 (+lawful public static retrieval)",
        },
        signal: AbortSignal.timeout(120000),
      });
      // An ordinary HTTP response, including 4xx, is definitive. Only retry
      // transport failures and stalled connections, which occur intermittently
      // on the public CDN.
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}
async function pdfMetadata(pdfPath) {
  const [info, text] = await Promise.all([
    command("pdfinfo", [pdfPath]),
    command("pdftotext", ["-f", "1", "-l", "1", "-layout", pdfPath, "-"]),
  ]);
  const pages = Number((info.match(/^Pages:\s+(\d+)/m) || [])[1]);
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const title =
    lines.find((x) => /monthly market insights/i.test(x)) ||
    lines.slice(0, 5).join(" ").slice(0, 240) ||
    "Monthly Market Insights";
  const fullText = `${lines.join(" ")}\n${text}`;
  const date = (fullText.match(
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2},?)?\s+20\d{2}/i,
  ) ||
    fullText.match(/20\d{2}[-/]\d{1,2}[-/]\d{1,2}/) || [""])[0];
  return {
    pages: Number.isFinite(pages) ? pages : "",
    title,
    date,
    firstPageText: text,
  };
}

await mkdir(pdfDir, { recursive: true });
await mkdir(extractDir, { recursive: true });
let existing = new Map();
if (existsSync(manifestPath))
  existing = parseCsv(await readFile(manifestPath, "utf8"));
const reports = monthsInclusive(start, end).filter(
  (month) => !excludedMonths.has(month),
);
if (reports.length > limit)
  throw new Error(
    `The selected range has ${reports.length} months, above --limit=${limit}. Use --exclude=YYYY-MM to make the selection explicit.`,
  );
const results = new Map(
  [...existing].filter(([month]) => reports.includes(month)),
);
let cursor = 0,
  accepted = 0;

async function one(month) {
  const file = `monthly-market-insights-${month}.pdf`;
  const url = `${baseUrl}/${file}`;
  const current = existing.get(month);
  if (
    !refresh &&
    current?.access_status === "verified_pdf" &&
    existsSync(join(dataDir, current.local_pdf || ""))
  ) {
    return {
      month,
      skip: true,
      row: { ...current, report_date: current.report_date || month },
    };
  }
  try {
    const response = await fetchWithRetry(url);
    const status = response.status;
    if (!response.ok)
      return {
        month,
        row: {
          report_month: month,
          source_url: url,
          access_status: "unavailable",
          http_status: status,
          notes: `HTTP ${status}; no PDF saved`,
        },
      };
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.subarray(0, 4).toString("ascii") !== "%PDF")
      return {
        month,
        row: {
          report_month: month,
          source_url: url,
          access_status: "invalid_response",
          http_status: status,
          notes: `HTTP ${status}; response did not start with PDF magic`,
        },
      };
    const out = join(pdfDir, file),
      tmp = `${out}.part`;
    await writeFile(tmp, bytes);
    await rename(tmp, out);
    let meta;
    try {
      meta = await pdfMetadata(out);
    } catch (e) {
      await unlink(out).catch(() => {});
      return {
        month,
        row: {
          report_month: month,
          source_url: url,
          access_status: "invalid_pdf",
          http_status: status,
          notes: `PDF magic passed but parser failed: ${e.message}`,
        },
      };
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const allText = await command("pdftotext", ["-layout", out, "-"]);
    await writeFile(
      join(extractDir, `monthly-market-insights-${month}.txt`),
      allText,
    );
    return {
      month,
      row: {
        report_month: month,
        source_url: url,
        local_pdf: `source_pdfs/${file}`,
        sha256,
        page_count: meta.pages,
        report_date: meta.date || month,
        title: meta.title,
        access_status: "verified_pdf",
        http_status: status,
        notes:
          "PDF magic and pdfinfo verified; full text extracted with pdftotext.",
      },
    };
  } catch (e) {
    return {
      month,
      row: {
        report_month: month,
        source_url: url,
        access_status: "fetch_error",
        notes: `${e.name}: ${e.message}`,
      },
    };
  }
}
async function worker() {
  while (true) {
    const i = cursor++;
    if (i >= reports.length) return;
    if (accepted >= limit) return;
    const r = await one(reports[i]);
    results.set(r.month, r.row);
    if (r.row.access_status === "verified_pdf" && !r.skip) accepted++;
    console.error(
      `${r.month}: ${r.row.access_status}${r.row.page_count ? ` (${r.row.page_count} pages)` : ""}`,
    );
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));
const ordered = [...results.values()].sort((a, b) =>
  a.report_month.localeCompare(b.report_month),
);
const header =
  "report_month,source_url,local_pdf,sha256,page_count,report_date,title,access_status,http_status,notes";
await writeFile(manifestPath, `${header}\n${ordered.map(csvRow).join("\n")}\n`);
const verified = ordered.filter((x) => x.access_status === "verified_pdf");
console.log(
  JSON.stringify(
    {
      candidates: reports.length,
      verified: verified.length,
      requested_limit: limit,
      manifest: manifestPath,
    },
    null,
    2,
  ),
);
