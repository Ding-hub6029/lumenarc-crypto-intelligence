# Data and source provenance

## Corpus

The research corpus contains 30 original English Binance Research Monthly Market Insights PDF reports. The fixed selection runs from March 2024 through September 2026 and excludes December 2024. The exclusion is declared rather than silently filling a list with unavailable material. `manifest.csv` contains one row for each of the 30 reports.

Each manifest row records the report month, exact original PDF URL, local file path, SHA256 hash, PDF page count, report title, access status, HTTP status, and text-extraction note. All 30 selected reports returned a successful HTTP response, passed the PDF magic-byte check, passed PDF metadata inspection, and produced text. The evaluation application parsed all 30 original PDFs again and counted 559 PDF pages and 1,017 searchable passages during the development run.

Reproduce the corpus from the publisher's public static URLs:

```bash
node scripts/import_corpus.mjs --start=2024-03 --end=2026-09 --exclude=2024-12 --limit=30 --concurrency=5
```

The command writes original PDF bytes to `data/source_pdfs/` and full extracted text to `data/extracted_text/`. Both directories are ignored by Git because redistribution rights for complete report copies and full extracts have not been established. The source manifest, page-referenced question labels, and public URLs are included. A public URL does not itself grant redistribution rights. Re-download only under the publisher's applicable terms.

The file `source_pdfs/monthly-market-insights-2026-02.pdf` is used by the local demo sample import endpoint when present. If it is absent, the endpoint fetches the same original public PDF on demand. That network step can fail if the publisher's CDN is unavailable.

## Evaluation questions

The 12-case development file is `dev_questions.jsonl`. All development labels refer to source reports dated March through August 2024. The 50-case final holdout is `holdout_questions.jsonl`, using reports dated September 2024 or later. The report-month sets do not overlap. Forty holdout questions ask for exact report figures and ten ask for facts the corresponding report does not state.

A question record has `id`, `split`, `question`, `answer`, `answer_type`, `report_month`, `source_url`, `local_pdf`, `pdf_page`, `printed_page`, `evidence_quote`, `label_status`, and `provenance`. No-answer cases also have `no_answer_reason` and `negative_evidence`. The printed page number is the report's internal page label, usually one less than the PDF viewer page number used by the app.

The script `scripts/build_questions.py` creates these files from authored questions and checks that every quoted evidence fragment appears on the stated original PDF page. It will stop rather than invent a quote if an extraction differs. No-answer labels additionally include a reason. Phrase searches over the complete extracted report were used for the resistance and target questions, but absence of a phrase is not proof that an equivalent idea is absent. These are source-text-checked candidate labels, not a claim of independent human hand labeling. The student should manually review all 50 labels in the PDF viewer before submitting a claim of hand verification.

Avoid editing the holdout questions after the final configuration is frozen. The evaluation runner checks its SHA256 against a pinned value and refuses to evaluate a changed label file. Do not select prompts, retrieval settings, or refusal thresholds by looking at holdout outcomes.

## Validation and limitations

The importer verifies original HTTP responses, PDF signatures, metadata, and checksum. The label generator validates quoted substrings on the assigned PDF page. The evaluator separately verifies the downloaded PDF bytes against manifest checksums, re-parses them with the production parser, and checks page counts before predicting. These checks establish that the corpus is real and retrievable, not that every publisher claim is independently true or that all extracted tables preserve their intended layout.
