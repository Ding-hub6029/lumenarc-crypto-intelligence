import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  ExternalLink,
  FileText,
  Globe2,
  Layers3,
  LayoutDashboard,
  LoaderCircle,
  Newspaper,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { translate, type CopyKey, type Lang } from "./i18n";

type View = "overview" | "research" | "news" | "methods";
type Status =
  | "Supported"
  | "Insufficient evidence"
  | "Conflicting evidence"
  | "Needs clarification";
type Document = {
  id: string;
  name: string;
  format: string;
  sourceUrl?: string;
  pageCount: number;
  characterCount: number;
  chunkCount: number;
  addedAt: string;
};
type Passage = {
  id: string;
  documentName: string;
  page: number;
  text: string;
  sourceUrl?: string;
};
type Answer = {
  status: Status;
  answer: string;
  evidence: Passage[];
  note: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    estimatedUsd: number | null;
  };
};
type Price = {
  symbol: string;
  productId: string;
  price: number;
  change24h: number | null;
  eventTime: string;
  receivedAt: string;
};
type Market = {
  prices: Price[];
  status: string;
  lastMessageAt: string | null;
  expectedSymbols: string[];
};
type News = {
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
};
type AiStatus = {
  configured: boolean;
  model: string;
  provider: string;
  usedRequests: number;
  maxRequests: number;
};

const symbols = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "BNB",
  "DOGE",
  "ADA",
  "AVAX",
  "LINK",
  "LTC",
];
const coinNames: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  XRP: "XRP",
  BNB: "BNB",
  DOGE: "Dogecoin",
  ADA: "Cardano",
  AVAX: "Avalanche",
  LINK: "Chainlink",
  LTC: "Litecoin",
};
const coinColors: Record<string, string> = {
  BTC: "#f7a844",
  ETH: "#9eaaf8",
  SOL: "#ae8eff",
  XRP: "#dedff3",
  BNB: "#eccb6b",
  DOGE: "#dbbd72",
  ADA: "#70bcfc",
  AVAX: "#fc7378",
  LINK: "#7196fb",
  LTC: "#a4bacd",
};

function getSession(): string {
  const existing = localStorage.getItem("lumenarc-session");
  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem("lumenarc-session", id);
  return id;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { "x-lumen-session": getSession(), ...(options?.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload as T;
}

function formatPrice(value: number | undefined) {
  if (value === undefined) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 5 : 2,
  });
}

function formatDate(value: string | null | undefined, lang: Lang) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return date.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IconButton({
  children,
  onClick,
  className = "",
  disabled = false,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`icon-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function EvidenceCard({ answer, lang }: { answer: Answer; lang: Lang }) {
  const t = (key: CopyKey) => translate(lang, key);
  const statusLabel: Record<Status, string> = {
    Supported: t("supported"),
    "Insufficient evidence": t("insufficient"),
    "Conflicting evidence": t("conflicting"),
    "Needs clarification": t("clarification"),
  };
  return (
    <div className="answer-result animate-in">
      <div className="answer-topline">
        <span
          className={`evidence-state ${answer.status === "Supported" ? "positive" : "caution"}`}
        >
          <span className="state-dot" />
          {statusLabel[answer.status]}
        </span>
        <span className="answer-model">{answer.model || t("modeKeyword")}</span>
      </div>
      <p className="answer-text">{answer.answer}</p>
      {answer.note && <p className="answer-note">{answer.note}</p>}
      {answer.evidence.length > 0 && (
        <div className="evidence-list">
          <div className="eyebrow">
            {t("evidence")}{" "}
            <span>{answer.evidence.length.toString().padStart(2, "0")}</span>
          </div>
          {answer.evidence.map((item) => (
            <details key={item.id} className="evidence-item">
              <summary>
                <FileText size={16} />
                <span>{item.documentName}</span>
                <span className="page-chip">
                  {item.documentName.toLowerCase().endsWith(".pdf")
                    ? `p. ${item.page}`
                    : t("extractedText")}
                </span>
                <ChevronDown size={15} />
              </summary>
              <p>{item.text}</p>
              {item.sourceUrl && (
                <a target="_blank" rel="noreferrer" href={item.sourceUrl}>
                  {t("viewSource")} <ExternalLink size={12} />
                </a>
              )}
            </details>
          ))}
        </div>
      )}
      {answer.usage && (
        <div className="result-footnote">
          {t("usedTokens")}:{" "}
          {answer.usage.promptTokens + answer.usage.completionTokens}{" "}
          <span>·</span>{" "}
          {answer.usage.estimatedUsd === null
            ? t("unknownCost")
            : `$${answer.usage.estimatedUsd.toFixed(5)}`}
        </div>
      )}
    </div>
  );
}

function MarketBoard({
  market,
  history,
  lang,
  onAnalyze,
  analysis,
  analyzing,
}: {
  market: Market;
  history: Record<string, number[]>;
  lang: Lang;
  onAnalyze: () => void;
  analysis: Answer | null;
  analyzing: boolean;
}) {
  const t = (key: CopyKey) => translate(lang, key);
  const bySymbol = new Map(market.prices.map((item) => [item.symbol, item]));
  return (
    <section className="market-panel glass-panel">
      <div className="section-heading">
        <div>
          <div className="eyebrow">
            <Radio size={14} /> {t("live")}
          </div>
          <h2>
            {lang === "en" ? "The market, in motion." : "市场，持续变化。"}
          </h2>
        </div>
        <div
          className={`connection-pill ${market.status === "live" ? "is-live" : "is-offline"}`}
        >
          <span className="state-dot" />
          {market.status === "live"
            ? t("live")
            : market.status === "stale"
              ? t("stale")
              : market.status === "partial"
                ? t("partial")
                : market.status === "reconnecting"
                  ? t("reconnecting")
                  : t("connecting")}
        </div>
      </div>
      <div className="market-grid">
        {symbols.map((symbol) => {
          const value = bySymbol.get(symbol);
          const trend = history[symbol] || [];
          const min = Math.min(...trend),
            max = Math.max(...trend);
          const range = max - min || 1;
          const points = trend
            .map(
              (price, index) =>
                `${(index * 98) / Math.max(1, trend.length - 1)},${26 - ((price - min) / range) * 20}`,
            )
            .join(" ");
          return (
            <div key={symbol} className="coin-card">
              <div className="coin-top">
                <span
                  className="coin-emblem"
                  style={{
                    color: coinColors[symbol],
                    borderColor: `${coinColors[symbol]}55`,
                  }}
                >
                  {symbol.slice(0, 1)}
                </span>
                <span>
                  <strong>{symbol}</strong>
                  <small>{coinNames[symbol]}</small>
                </span>
                <svg
                  className="sparkline"
                  viewBox="0 0 100 30"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {trend.length > 1 && (
                    <polyline
                      points={points}
                      fill="none"
                      stroke={
                        value?.change24h !== null && (value?.change24h ?? 0) < 0
                          ? "#ff8d9b"
                          : "#a8f8d4"
                      }
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </div>
              <div className="coin-bottom">
                <span className="coin-price">
                  {formatPrice(value?.price)} <small>USDT</small>
                </span>
                <span
                  className={`change ${value?.change24h !== null && (value?.change24h ?? 0) < 0 ? "down" : "up"}`}
                >
                  {value?.change24h == null ? (
                    "—"
                  ) : (
                    <>
                      {value.change24h >= 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}
                      {Math.abs(value.change24h).toFixed(2)}%
                    </>
                  )}
                </span>
              </div>
              <small className="coin-time">
                {value ? formatDate(value.eventTime, lang) : t("noTicks")}
                {value && Date.now() - Date.parse(value.receivedAt) > 30000
                  ? ` · ${t("stale")}`
                  : ""}
              </small>
            </div>
          );
        })}
      </div>
      <div className="market-footer">
        <span>{t("marketSource")}</span>
        <span>
          {t("lastEvent")}: {formatDate(market.lastMessageAt, lang)}
        </span>
        <span>{t("marketDisclosure")}</span>
      </div>
      <div className="market-ai">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} /> {t("marketPulseTitle")}
          </span>
          <p>{t("marketPulseNote")}</p>
        </div>
        <button
          className="secondary-button"
          type="button"
          disabled={analyzing || market.status !== "live"}
          onClick={onAnalyze}
        >
          {analyzing ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <WandSparkles size={15} />
          )}
          {analyzing ? t("marketPulseBusy") : t("marketPulseAction")}
        </button>
      </div>
      {analysis && <EvidenceCard answer={analysis} lang={lang} />}
    </section>
  );
}

function App() {
  const [lang, setLang] = useState<Lang>(() =>
    localStorage.getItem("lumenarc-lang") === "zh" ? "zh" : "en",
  );
  const [view, setView] = useState<View>("overview");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"ai" | "keyword">("ai");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [brief, setBrief] = useState<Answer | null>(null);
  const [asking, setAsking] = useState(false);
  const [briefing, setBriefing] = useState(false);
  const [error, setError] = useState("");
  const [newsError, setNewsError] = useState("");
  const [news, setNews] = useState<News[]>([]);
  const [newsAt, setNewsAt] = useState(0);
  const [newsQuery, setNewsQuery] = useState("");
  const [newsBusy, setNewsBusy] = useState(false);
  const [newsAnalyzing, setNewsAnalyzing] = useState<string | null>(null);
  const [market, setMarket] = useState<Market>({
    prices: [],
    status: "connecting",
    lastMessageAt: null,
    expectedSymbols: symbols,
  });
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>(
    {},
  );
  const [marketAnalysis, setMarketAnalysis] = useState<Answer | null>(null);
  const [marketAnalyzing, setMarketAnalyzing] = useState(false);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeNewsQuery = useRef("");
  const t = (key: CopyKey) => translate(lang, key);
  const providerLabel =
    ai?.provider === "Manus project AI" ? t("projectAi") : ai?.provider || "—";

  useEffect(() => {
    localStorage.setItem("lumenarc-lang", lang);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  useEffect(() => {
    api<Document[]>("/api/documents")
      .then(setDocuments)
      .catch((error) => setError(error.message));
    api<{ ai: AiStatus }>("/api/status")
      .then((result) => setAi(result.ai))
      .catch(() => {});
    const stream = new EventSource("/api/market/stream");
    stream.addEventListener("snapshot", (event) =>
      setMarket(JSON.parse((event as MessageEvent).data)),
    );
    stream.addEventListener("health", (event) =>
      setMarket(JSON.parse((event as MessageEvent).data)),
    );
    stream.addEventListener("price", (event) => {
      const price = JSON.parse((event as MessageEvent).data) as Price;
      setMarket((previous) => {
        const prices = [
          ...previous.prices.filter((item) => item.symbol !== price.symbol),
          price,
        ];
        const allFresh =
          prices.length === symbols.length &&
          prices.every(
            (item) => Date.now() - Date.parse(item.receivedAt) < 30000,
          );
        return {
          ...previous,
          prices,
          lastMessageAt: price.receivedAt,
          status:
            previous.status === "reconnecting"
              ? "reconnecting"
              : allFresh
                ? "live"
                : "partial",
        };
      });
      setPriceHistory((previous) => ({
        ...previous,
        [price.symbol]: [...(previous[price.symbol] || []), price.price].slice(
          -35,
        ),
      }));
    });
    stream.onerror = () =>
      setMarket((previous) => ({ ...previous, status: "reconnecting" }));
    return () => stream.close();
  }, []);

  const loadNews = async (refresh = false, query = "") => {
    setNewsBusy(true);
    try {
      const data = await api<{
        items: News[];
        at: number;
        error: string | null;
      }>(
        `/api/news${refresh || query ? `?${new URLSearchParams({ ...(refresh ? { refresh: "1" } : {}), ...(query ? { q: query } : {}) })}` : ""}`,
      );
      setNews(data.items);
      setNewsAt(data.at);
      setNewsError(data.error || "");
    } catch (reason) {
      setNewsError(
        reason instanceof Error ? reason.message : t("dataUnavailable"),
      );
    } finally {
      setNewsBusy(false);
    }
  };
  useEffect(() => {
    loadNews(false).catch(() => {});
    const timer = setInterval(
      () => loadNews(false, activeNewsQuery.current).catch(() => {}),
      90000,
    );
    return () => clearInterval(timer);
  }, []);

  const uploadFiles = async (files: FileList | File[]) => {
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const item = await api<Document>("/api/documents", {
          method: "POST",
          body,
        });
        setDocuments((previous) => [...previous, item]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("emptyError"));
    } finally {
      setUploading(false);
    }
  };

  const importSample = async () => {
    setError("");
    setUploading(true);
    try {
      const item = await api<Document>("/api/documents/import-sample", {
        method: "POST",
      });
      setDocuments((previous) => [...previous, item]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("emptyError"));
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = async (id: string) => {
    try {
      await api("/api/documents/" + id, { method: "DELETE" });
      setDocuments((previous) => previous.filter((item) => item.id !== id));
      setAnswer(null);
      setBrief(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("emptyError"));
    }
  };

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim() || !documents.length) return;
    setAsking(true);
    setError("");
    setAnswer(null);
    try {
      setAnswer(
        await api<Answer>("/api/research/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, mode, language: lang }),
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("emptyError"));
    } finally {
      setAsking(false);
    }
  };

  const makeBrief = async () => {
    if (!documents.length) return;
    setBriefing(true);
    setError("");
    setBrief(null);
    try {
      setBrief(
        await api<Answer>("/api/research/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: lang }),
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("emptyError"));
    } finally {
      setBriefing(false);
    }
  };

  const analyzeArticle = async (id: string) => {
    setNewsAnalyzing(id);
    try {
      const item = await api<News>("/api/news/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNews((previous) =>
        previous.map((newsItem) => (newsItem.id === id ? item : newsItem)),
      );
    } catch (reason) {
      setNewsError(reason instanceof Error ? reason.message : t("emptyError"));
    } finally {
      setNewsAnalyzing(null);
    }
  };

  const analyzeMarket = async () => {
    setMarketAnalyzing(true);
    setMarketAnalysis(null);
    setError("");
    try {
      setMarketAnalysis(
        await api<Answer>("/api/market/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: lang }),
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("emptyError"));
    } finally {
      setMarketAnalyzing(false);
    }
  };

  const nav: { id: View; icon: ReactNode; label: CopyKey }[] = [
    { id: "overview", icon: <LayoutDashboard size={18} />, label: "overview" },
    { id: "research", icon: <BookOpenText size={18} />, label: "research" },
    { id: "news", icon: <Newspaper size={18} />, label: "news" },
    { id: "methods", icon: <Compass size={18} />, label: "methods" },
  ];

  const library = (
    <div className="panel glass-panel library-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">01 / {t("research")}</span>
          <h3>{t("documents")}</h3>
          <p>{t("documentsSub")}</p>
        </div>
        <span className="count-chip">
          {documents.length.toString().padStart(2, "0")}
        </span>
      </div>
      <div
        className="upload-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files.length)
            uploadFiles(event.dataTransfer.files);
        }}
      >
        <div className="upload-icon">
          <UploadCloud size={24} />
        </div>
        <strong>{t("addDocs")}</strong>
        <span>{t("uploadHint")}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          multiple
          className="sr-only"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (event.target.files) uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          className="secondary-button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Plus size={16} />
          )}
          {t("addDocs")}
        </button>
      </div>
      {!documents.length ? (
        <div className="empty-library">
          <span>{t("noDocs")}</span>
          <p>{t("noDocsBody")}</p>
        </div>
      ) : (
        <div className="document-list">
          {documents.map((doc) => (
            <div className="document-row" key={doc.id}>
              <div className="document-icon">
                <FileText size={19} />
              </div>
              <div className="document-info">
                <strong title={doc.name}>{doc.name}</strong>
                <small>
                  {doc.pageCount} {t("pages")} · {doc.chunkCount}{" "}
                  {t("passages")}
                </small>
              </div>
              <IconButton
                title={t("remove")}
                onClick={() => removeDocument(doc.id)}
              >
                <Trash2 size={15} />
              </IconButton>
            </div>
          ))}
        </div>
      )}
      <button
        className="link-button"
        onClick={importSample}
        disabled={uploading}
      >
        {uploading ? (
          <LoaderCircle size={15} className="spin" />
        ) : (
          <ArrowRight size={15} />
        )}
        {uploading ? t("importing") : t("importSample")}
      </button>
    </div>
  );

  const researchArea = (
    <div className="research-grid">
      <div className="research-left">
        {library}
        <div className="panel glass-panel brief-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">03 / {t("introBrief")}</span>
              <h3>{t("briefTitle")}</h3>
              <p>{t("briefSub")}</p>
            </div>
            <WandSparkles size={22} className="subtle-icon" />
          </div>
          <button
            className="primary-button wide"
            onClick={makeBrief}
            disabled={briefing || !documents.length}
          >
            {briefing ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {briefing ? t("generating") : t("generateBrief")}
          </button>
          {brief ? (
            <EvidenceCard answer={brief} lang={lang} />
          ) : (
            <p className="support-text">{t("briefHint")}</p>
          )}
        </div>
      </div>
      <div className="panel glass-panel question-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">02 / {t("research")}</span>
            <h3>{t("askTitle")}</h3>
            <p>{t("askSub")}</p>
          </div>
          <div className="question-accent">
            <Sparkles size={22} />
          </div>
        </div>
        <form onSubmit={submitQuestion}>
          <label className="sr-only" htmlFor="question">
            {t("askTitle")}
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t("questionPlaceholder")}
            maxLength={600}
            rows={4}
          />
          <div className="ask-options">
            <div className="segmented">
              <button
                type="button"
                className={mode === "ai" ? "selected" : ""}
                onClick={() => setMode("ai")}
              >
                <Sparkles size={13} />
                {t("modeAI")}
              </button>
              <button
                type="button"
                className={mode === "keyword" ? "selected" : ""}
                onClick={() => setMode("keyword")}
              >
                <Search size={13} />
                {t("modeKeyword")}
              </button>
            </div>
            <span>
              {documents.length} {t("manySources")}
            </span>
          </div>
          <button
            type="submit"
            className="primary-button"
            disabled={asking || !question.trim() || !documents.length}
          >
            {asking ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <ArrowRight size={17} />
            )}
            {asking ? t("asking") : t("ask")}
          </button>
        </form>
        <div className="answer-shell">
          <div className="answer-shell-title">
            <span className="eyebrow">{t("answer")}</span>
            <span className="tiny-orb" />
          </div>
          {answer ? (
            <EvidenceCard answer={answer} lang={lang} />
          ) : (
            <div className="answer-placeholder">
              <div className="placeholder-rings">
                <Layers3 size={30} />
              </div>
              <p>{t("noAnswer")}</p>
            </div>
          )}
        </div>
        <div className="tip-line">
          <ShieldCheck size={16} />
          {t("researchNote")}
        </div>
      </div>
    </div>
  );

  const newsArea = (
    <section className="news-section">
      <div className="news-header">
        <div>
          <span className="eyebrow">
            <span className="mini-led" /> {t("newsStatus")}
          </span>
          <h2>{t("newsTitle")}</h2>
          <p>{t("newsSub")}</p>
        </div>
        <span className="news-refresh-time">
          {t("retrieved")}:{" "}
          {formatDate(newsAt ? new Date(newsAt).toISOString() : null, lang)}
        </span>
      </div>
      <form
        className="news-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          activeNewsQuery.current = newsQuery;
          loadNews(false, newsQuery);
        }}
      >
        <div className="search-field">
          <Search size={18} />
          <input
            value={newsQuery}
            onChange={(event) => setNewsQuery(event.target.value)}
            placeholder={t("newsPlaceholder")}
            aria-label={t("searchNews")}
          />
        </div>
        <button type="submit" className="secondary-button">
          {t("searchNews")}
        </button>
        <button
          type="button"
          className="refresh-button"
          onClick={() => {
            activeNewsQuery.current = newsQuery;
            loadNews(true, newsQuery);
          }}
          disabled={newsBusy}
        >
          <RefreshCw size={17} className={newsBusy ? "spin" : ""} />
          {newsBusy ? t("refreshing") : t("refresh")}
        </button>
      </form>
      {newsError && <div className="inline-warning">{newsError}</div>}
      <div className="news-list">
        {news.length ? (
          news.map((item, index) => (
            <article
              className="news-card glass-panel"
              key={`${item.id}-${index}`}
            >
              <div className="news-index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="news-content">
                <div className="news-meta">
                  <span className="publisher-dot" />
                  {item.publisher}
                  <span className="meta-sep">/</span>
                  {formatDate(item.publishedAt, lang)}
                  <span className="scope-chip">
                    {item.scope === "Broad market"
                      ? t("marketWide")
                      : t("coinSpecific")}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <div className="news-actions">
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {t("openStory")} <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    disabled={newsAnalyzing === item.id}
                    onClick={() => analyzeArticle(item.id)}
                  >
                    {newsAnalyzing === item.id ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : (
                      <Sparkles size={15} />
                    )}
                    {newsAnalyzing === item.id
                      ? t("analyzingNews")
                      : t("analyzeNews")}
                  </button>
                </div>
                {item.stance && (
                  <div className="news-analysis">
                    <span>
                      {item.stance === "Positive"
                        ? t("positive")
                        : item.stance === "Negative"
                          ? t("negative")
                          : item.stance === "Mixed"
                            ? t("mixed")
                            : t("unclear")}
                    </span>
                    <p>{item.rationale}</p>
                    <small>{t("headlineOnly")}</small>
                  </div>
                )}
              </div>
              <ArrowUpRight className="news-chevron" size={19} />
            </article>
          ))
        ) : (
          <div className="no-news">
            {newsBusy ? <LoaderCircle className="spin" /> : <CircleHelp />}
            <p>{newsBusy ? t("refreshing") : t("noNews")}</p>
          </div>
        )}
      </div>
    </section>
  );

  const methodsArea = (
    <section className="methods-section">
      <div className="section-intro">
        <span className="eyebrow">{t("sectionLabel")} / 04</span>
        <h2>{t("coverage")}</h2>
        <p>{t("coverageSub")}</p>
      </div>
      <div className="methods-grid">
        {(["method1", "method2", "method3", "method4"] as const).map(
          (key, index) => (
            <article key={key} className="method-card glass-panel">
              <span className="method-index">0{index + 1}</span>
              <div className="method-icon">
                {
                  [
                    <FileText key="a" />,
                    <ShieldCheck key="b" />,
                    <Activity key="c" />,
                    <Newspaper key="d" />,
                  ][index]
                }
              </div>
              <h3>{t(`${key}Title` as CopyKey)}</h3>
              <p>{t(key as CopyKey)}</p>
            </article>
          ),
        )}
      </div>
      <div className="method-footer">
        <div>
          <strong>{t("evaluation")}</strong>
          <p>{t("evalBody")}</p>
        </div>
        <div>
          <strong>{t("privacy")}</strong>
          <p>{t("privacyBody")}</p>
        </div>
      </div>
    </section>
  );

  const marketBoard = (
    <MarketBoard
      market={market}
      history={priceHistory}
      lang={lang}
      onAnalyze={analyzeMarket}
      analysis={marketAnalysis}
      analyzing={marketAnalyzing}
    />
  );
  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setView("overview")}
          aria-label="LumenArc Home"
        >
          <span className="brand-mark">
            <span />
          </span>
          <span className="brand-name">
            LUMEN<span>ARC</span>
          </span>
        </button>
        <div className="sidebar-divider" />
        <div className="sidebar-label">{t("workspace")}</div>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
            >
              {item.icon}
              <span>{t(item.label)}</span>
              {view === item.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-system">
            <span className="system-pulse" />
            <span>{ai?.configured ? t("ready") : t("aiNotReady")}</span>
          </div>
          <div className="side-credit">{t("disclaimer")}</div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{t("sectionLabel")}</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{t(view)}</strong>
          </div>
          <div className="top-actions">
            <span className="top-date">
              {new Date().toLocaleDateString(
                lang === "zh" ? "zh-CN" : "en-US",
                { month: "short", day: "numeric", year: "numeric" },
              )}
            </span>
            <button
              className="language-button"
              onClick={() => setLang(lang === "en" ? "zh" : "en")}
              aria-label={lang === "en" ? "Switch to Chinese" : "切换为英语"}
            >
              <Globe2 size={16} />
              <span>{lang === "en" ? "EN" : "中文"}</span>
              <span className="language-divider" />
              {lang === "en" ? "中文" : "EN"}
            </button>
            <span className="avatar">LX</span>
          </div>
        </header>
        <div className="view-content" key={view}>
          {error && (
            <div className="global-error" role="alert">
              <span>{error}</span>
              <IconButton title="Close" onClick={() => setError("")}>
                <X size={16} />
              </IconButton>
            </div>
          )}
          {view === "overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow hero-eyebrow">
                    <span className="mini-led" /> {t("sectionLabel")} / 01
                  </span>
                  <h1>{t("tagline")}</h1>
                  <p>{t("subtitle")}</p>
                  <button
                    className="hero-action"
                    onClick={() => setView("research")}
                  >
                    {t("research")} <ArrowRight size={17} />
                  </button>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="orbital orbit-one" />
                  <div className="orbital orbit-two" />
                  <div className="hero-core">
                    <div className="core-star">✦</div>
                  </div>
                  <div className="hero-coordinate">
                    01 / SOURCE · SIGNAL · CONTEXT
                  </div>
                </div>
              </section>
              {marketBoard}
              <div className="overview-lower">
                <div
                  className="overview-feature glass-panel"
                  onClick={() => setView("research")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) =>
                    event.key === "Enter" && setView("research")
                  }
                >
                  <div className="feature-symbol">
                    <BookOpenText size={22} />
                  </div>
                  <span className="eyebrow">01 / {t("research")}</span>
                  <h3>{t("researchIntro")}</h3>
                  <p>{t("researchIntroSub")}</p>
                  <div className="feature-link">
                    {t("research")} <ArrowRight size={16} />
                  </div>
                </div>
                <div
                  className="overview-feature glass-panel"
                  onClick={() => setView("news")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) =>
                    event.key === "Enter" && setView("news")
                  }
                >
                  <div className="feature-symbol lavender">
                    <Newspaper size={22} />
                  </div>
                  <span className="eyebrow">02 / {t("news")}</span>
                  <h3>{t("newsTitle")}</h3>
                  <p>{t("newsSub")}</p>
                  <div className="feature-link">
                    {t("news")} <ArrowRight size={16} />
                  </div>
                </div>
                <div className="overview-stat glass-panel">
                  <span className="eyebrow">{t("provider")}</span>
                  <strong>{providerLabel}</strong>
                  <span>
                    {documents.length} {t("docsReady")}
                  </span>
                  <span className="provider-foot">
                    <ShieldCheck size={15} /> {t("supported")}
                  </span>
                </div>
              </div>
            </>
          )}
          {view === "research" && (
            <>
              <div className="section-intro">
                <span className="eyebrow">{t("sectionLabel")} / 02</span>
                <h2>{t("researchIntro")}</h2>
                <p>{t("researchIntroSub")}</p>
              </div>
              {researchArea}
            </>
          )}
          {view === "news" && newsArea}
          {view === "methods" && methodsArea}
        </div>
        <footer className="footer">
          <span>© 2026 LUMENARC</span>
          <span>{t("disclaimer")}</span>
          <span>
            {t("provider")}: {providerLabel}
          </span>
        </footer>
      </main>
    </div>
  );
}

export default App;
