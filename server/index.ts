import express from "express";
import cors from "cors";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { extractDocument } from "./documents.js";
import { answerQuestion, generateBrief, budgetStatus } from "./ai.js";
import { keywordBaseline } from "./search.js";
import {
  addMarketClient,
  marketSnapshot,
  startMarketStream,
} from "./market.js";
import { analyzeNews, fetchNews } from "./news.js";
import type { ResearchDocument } from "./types.js";

const app = express();
const sessions = new Map<
  string,
  { docs: Map<string, ResearchDocument>; lastUsed: number }
>();
const aiQuotas = new Map<string, { calls: number; resetAt: number }>();
const sessionTtlMs = 2 * 60 * 60 * 1000;
const maxSessions = 48;
const maxGlobalDocuments = 120;
const maxGlobalCharacters = 8_000_000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 18 * 1024 * 1024 },
});
app.disable("x-powered-by");
app.use(cors({ origin: false }));
app.use(express.json({ limit: "128kb" }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function userDocs(req: express.Request): Map<string, ResearchDocument> {
  const session = req.header("x-lumen-session");
  if (!session || !/^[a-f0-9-]{36}$/i.test(session))
    throw new Error("A local workspace session ID is required.");
  const now = Date.now();
  for (const [id, workspace] of sessions) {
    if (now - workspace.lastUsed > sessionTtlMs) {
      sessions.delete(id);
      aiQuotas.delete(id);
    }
  }
  let workspace = sessions.get(session);
  if (!workspace) {
    if (sessions.size >= maxSessions)
      throw new Error(
        "Temporary workspace capacity is reached. Try again later.",
      );
    workspace = { docs: new Map(), lastUsed: now };
    sessions.set(session, workspace);
  }
  workspace.lastUsed = now;
  return workspace.docs;
}

function checkDocumentCapacity(additionalCharacters = 0) {
  let count = 0;
  let characters = 0;
  for (const { docs } of sessions.values()) {
    count += docs.size;
    for (const doc of docs.values()) characters += doc.characterCount;
  }
  if (
    count >= maxGlobalDocuments ||
    characters + additionalCharacters > maxGlobalCharacters
  )
    throw new Error(
      "Temporary document capacity is reached. Remove documents before importing.",
    );
}

function consumeAiQuota(req: express.Request) {
  userDocs(req);
  const id = req.header("x-lumen-session")!;
  const now = Date.now();
  const record = aiQuotas.get(id);
  if (!record || now >= record.resetAt) {
    aiQuotas.set(id, { calls: 1, resetAt: now + 60 * 60 * 1000 });
    return;
  }
  if (record.calls >= 30)
    throw new Error("This workspace reached its hourly AI request limit.");
  record.calls++;
}

function selectedDocs(req: express.Request): ResearchDocument[] {
  const docs = userDocs(req);
  const requested: unknown[] = Array.isArray(req.body?.documentIds)
    ? req.body.documentIds
    : [];
  return requested.length
    ? requested
        .map((id: unknown) => docs.get(String(id)))
        .filter((doc: ResearchDocument | undefined): doc is ResearchDocument =>
          Boolean(doc),
        )
    : [...docs.values()];
}

app.get("/health", (_req, res) =>
  res.json({
    ok: true,
    market: marketSnapshot().status,
    aiConfigured: budgetStatus().configured,
  }),
);
app.get("/api/status", (_req, res) =>
  res.json({ ai: budgetStatus(), market: marketSnapshot() }),
);
app.get("/api/documents", (req, res) => {
  try {
    res.json(
      [...userDocs(req).values()].map(({ passages, ...doc }) => ({
        ...doc,
        chunkCount: passages.length,
      })),
    );
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
app.post("/api/documents", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      throw new Error("Select a PDF, DOCX, TXT or Markdown document.");
    const docs = userDocs(req);
    if (docs.size >= 40)
      throw new Error(
        "This workspace is limited to 40 documents. Remove one before importing.",
      );
    checkDocumentCapacity();
    const doc = await extractDocument(req.file.buffer, req.file.originalname);
    checkDocumentCapacity(doc.characterCount);
    docs.set(doc.id, doc);
    const { passages, ...metadata } = doc;
    res.status(201).json({ ...metadata, chunkCount: passages.length });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
app.delete("/api/documents/:id", (req, res) => {
  try {
    res.json({ removed: userDocs(req).delete(String(req.params.id)) });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
app.post("/api/documents/import-sample", async (req, res) => {
  try {
    const docs = userDocs(req);
    if (docs.size >= 40) throw new Error("Workspace capacity reached.");
    checkDocumentCapacity();
    const url =
      "https://public.bnbstatic.com/static/files/research/monthly-market-insights-2026-02.pdf";
    const localPath = resolve(
      root,
      "data/source_pdfs/monthly-market-insights-2026-02.pdf",
    );
    let bytes: Buffer;
    if (existsSync(localPath)) bytes = await readFile(localPath);
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
      if (!response.ok)
        throw new Error("The original research PDF is unavailable right now.");
      bytes = Buffer.from(await response.arrayBuffer());
    }
    const doc = await extractDocument(
      bytes,
      "Binance Research - February 2026.pdf",
      url,
    );
    checkDocumentCapacity(doc.characterCount);
    docs.set(doc.id, doc);
    const { passages, ...metadata } = doc;
    res.status(201).json({ ...metadata, chunkCount: passages.length });
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});
app.post("/api/research/ask", async (req, res) => {
  try {
    const docs = selectedDocs(req);
    if (!docs.length)
      throw new Error("Import a readable source document first.");
    const question = String(req.body?.question ?? "")
      .trim()
      .slice(0, 600);
    if (!question) throw new Error("Enter a question.");
    if (req.body?.mode !== "keyword") consumeAiQuota(req);
    const answer =
      req.body?.mode === "keyword"
        ? keywordBaseline(question, docs)
        : await answerQuestion(
            question,
            docs,
            req.body?.language === "zh" ? "zh" : "en",
          );
    res.json(answer);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
app.post("/api/research/brief", async (req, res) => {
  try {
    const docs = selectedDocs(req);
    if (!docs.length)
      throw new Error("Import a readable source document first.");
    consumeAiQuota(req);
    res.json(
      await generateBrief(docs, req.body?.language === "zh" ? "zh" : "en"),
    );
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
app.get("/api/market", (_req, res) => res.json(marketSnapshot()));
app.post("/api/market/analyze", async (req, res) => {
  try {
    const snapshot = marketSnapshot();
    if (snapshot.status !== "live" || snapshot.prices.length !== 10)
      throw new Error(
        "All ten live exchange prices are required before generating a market pulse.",
      );
    consumeAiQuota(req);
    const observedAt = new Date().toISOString();
    const source = [
      `Observed Binance Spot market data at ${observedAt}. These quotes are denominated in USDT rather than fiat USD. No future prices are known.`,
      ...snapshot.prices.map((price) => {
        if (!price) return "";
        const change =
          price.change24h === null
            ? "24-hour change unavailable"
            : `24-hour change ${price.change24h.toFixed(2)} percent`;
        return `${price.symbol}/USDT last traded at ${price.price.toFixed(8)} USDT on ${price.eventTime}, ${change}.`;
      }),
    ].join("\n");
    const id = `live-market-${Date.now()}`;
    const document: ResearchDocument = {
      id,
      name: "Binance Spot live market data.txt",
      format: "txt",
      addedAt: observedAt,
      pageCount: 1,
      characterCount: source.length,
      passages: [
        {
          id: `${id}:observed`,
          documentId: id,
          documentName: "Binance Spot live market data.txt",
          page: 1,
          text: source,
        },
      ],
    };
    const result = await answerQuestion(
      "Using only the observed Binance Spot USDT market source, describe the broad relative direction and name a stronger and a weaker asset symbol. Do not repeat any numeric price, percentage, timestamp, or asset count. Cite the supplied source. State that this is one momentary single-exchange observation, not a prediction or trading advice.",
      [document],
      req.body?.language === "zh" ? "zh" : "en",
    );
    res.json({
      ...result,
      note: `${result.note} Market observation recorded at ${observedAt}.`,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});
app.get("/api/market/stream", (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  addMarketClient(res);
});
app.get("/api/news", async (req, res) => {
  try {
    const query = String(req.query.q ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 80);
    res.json(await fetchNews(req.query.refresh === "1", query));
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});
app.post("/api/news/analyze", async (req, res) => {
  try {
    consumeAiQuota(req);
    res.json(await analyzeNews(String(req.body?.id ?? "")));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

const root = resolve(process.cwd());
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(resolve(root, "dist")));
  app.get("/{*path}", async (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    if (!existsSync(resolve(root, "dist/index.html")))
      return res.status(503).send("Frontend build unavailable");
    res
      .type("html")
      .send(await readFile(resolve(root, "dist/index.html"), "utf8"));
  });
}
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof multer.MulterError)
      return res
        .status(413)
        .json({ error: "File exceeds the 18 MB upload limit." });
    res.status(500).json({ error: "The request could not be completed." });
  },
);

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`LumenArc listening on ${port}`));
startMarketStream();
