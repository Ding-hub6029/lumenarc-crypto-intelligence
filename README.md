# LumenArc Crypto Intelligence

LumenArc is a working bilingual research prototype for an analyst reading cryptocurrency research reports. It extracts real PDF, DOCX, TXT, and Markdown content, retrieves page-marked passages, answers questions with cited evidence, creates a grounded research brief, shows ten event-driven USDT-quoted spot prices, and retrieves current sector news. It does not predict returns or execute trades.

The interface supports English and Simplified Chinese. The source files, evaluation labels, product documentation, and final report are in English.

## Final Project Video

Watch the complete demonstration directly on YouTube:

https://youtu.be/p8gAnGNghN0?si=KWcy5wya8AUTCqYM

## Run locally

Requirements are Node.js 22, pnpm 11.25.0, and internet access for live markets, news, and AI. Install Poppler utilities, specifically `pdfinfo` and `pdftotext`, if you intend to re-download the 30-report corpus. From the project root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. The server must listen on port 3000. The site and API share one origin. In the managed Preview, use the supplied Preview URL instead of opening the direct Vite port externally.

The keyword baseline, document extraction, market feed, and news work without an AI credential. For AI answers, briefs, the on-demand market pulse, and optional news context, configure `LUMEN_OPENROUTER_KEY` as a protected server environment secret. For a local run, export the variable in the server's shell before starting `pnpm dev`. The example environment file is documentation and is not automatically loaded by Node. Set `OPENROUTER_MODEL` to an affordable chat-capable model if the default is unavailable. Never expose this key through a `VITE_` variable, browser source, committed file, or API response. The default OpenRouter model is `qwen/qwen3-30b-a3b-instruct-2507`. A maximum of 200 AI requests is enforced per running process by default. Configure `MAX_OPENROUTER_REQUESTS` for a smaller limit. A request cap does not enforce a US$10 spending ceiling. Monitor the fixed school allocation and do not top it up.

Inside the managed project only, if the protected OpenRouter secret is not confirmed, the server uses the project-provided `gemini-3-flash-preview` AI service instead. The application status endpoint states the provider in use. This is a genuine AI fallback, not a mock response. Project AI usage and OpenRouter usage are not the same spending pool. The school key was intentionally never included in this repository.

To run a production-like local server:

```bash
pnpm build
NODE_ENV=production pnpm start
```

The `Dockerfile` provides a reproducible container build. Uploaded documents are held in server process memory and will disappear after a restart or two hours of workspace inactivity. The server limits the number of active workspaces and the aggregate document text, and caps AI calls per workspace hour. These measures are not a substitute for login or a dollar budget. Do not upload confidential documents to this teaching prototype.

## Typical analysis workflow

1. Open Research desk. Import the public sample or upload a text-based PDF, DOCX, TXT, or Markdown file, with a maximum file size of 18 MB.
2. Ask a precise question. Name the document and reporting period if more than one report is present. Select AI grounded answer or keyword baseline.
3. Inspect the evidence state, source PDF name, page number, and quoted passage. Supported is not a model-generated probability. A missing resistance level must produce an honest non-answer.
4. Generate a research brief. Its numbers must be present in cited passages.
5. Open News intelligence for fresh publisher headlines. Use the search field for an on-demand external news search. Optional AI context analyzes only the feed headline and excerpt.
6. Return to Overview for ten Binance Spot USDT pairs. Prices update on incoming WebSocket trade events, not from a once-per-minute snapshot. The interface clearly labels USDT rather than treating it as fiat USD. Last event times and connection health are visible. Click Analyze live market for a one-time source-cited AI pulse when all ten pairs are fresh.

A textless scanned PDF currently returns an error rather than pretending OCR succeeded. News retrieval is periodic discovery, not an exchange-speed news stream. A price is a single exchange's USDT-quoted spot trade, not a universal crypto market price or a precise fiat USD quote.

## Actual 30-report source corpus

`data/manifest.csv` records 30 original, accessible Binance Research monthly PDF reports spanning March 2024 to September 2026. Each row includes the exact public source URL, report month, SHA256, page count, successful access check, and local filename. The December 2024 report is intentionally outside this fixed 30-report selection.

Source PDFs and complete text extracts are not distributed in Git because reuse rights are not established. Fetch and parse the 30 original files yourself using:

```bash
node scripts/import_corpus.mjs --start=2024-03 --end=2026-09 --exclude=2024-12 --limit=30 --concurrency=5
```

The importer verifies PDF signatures, page metadata, source checksums, and text extraction. A first-time download is roughly a few hundred megabytes and may take several minutes. The already verified manifest identifies the exact corpus. Use the URLs only under the publisher's applicable terms. Do not redistribute the original PDF bytes without permission.

## Evaluation

`data/dev_questions.jsonl` has 12 development questions from March through August 2024. `data/holdout_questions.jsonl` has 50 source-checked questions from later reports, including 40 numerical answer cases and 10 cases where the requested fact is not stated. The two splits use disjoint report months. Labels are source-quote checked candidate labels, not falsely described as independent human verification. The evaluation runner parses all 30 original PDFs through the same parser used by the application.

```bash
pnpm test
pnpm check
pnpm build
pnpm eval --split=dev
pnpm eval --split=holdout
```

A finished evaluation is protected against overwriting existing results. Read `eval/README.md` before any new run. The documented `pnpm eval` wrapper also serializes attempts on the same split. Existing raw predictions and summaries in `eval/results/` record the measured benchmark, so rerunning those commands in this copy intentionally fails rather than silently replacing them. The holdout should be run only once with a frozen configuration. The runner verifies the frozen question-file checksum before processing.

## Documentation and delivery

- `docs/PRODUCT.md` gives persona, inputs, outputs, the architecture diagram, source provenance, targeted metrics, and limitations.
- `docs/FINAL_REPORT.md` is the structured course report. It explicitly explains why the implementation changed from the initially considered Streamlit approach to React and Node.
- `docs/DEMO_SCRIPT.md` outlines a short face-and-screen demonstration. The student must personally record the required face-visible video.
- `data/README.md` documents corpus access and question labels.
- `eval/README.md` documents scoring formulas, freeze policy, and verification caveats.

## Safety and scope

The application gives evidence-backed research assistance, not personalized investment advice. It never places orders. AI credentials remain on the backend. Uploaded content is treated as untrusted data in model instructions, and the application rejects a Supported numerical answer unless its cited passages contain the claimed numbers. This is not a guarantee of factual correctness. A model can misinterpret source material, sources can contradict each other, and extracted PDF tables may lose layout. Review citations manually before making any consequential decision.
