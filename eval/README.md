# Reproducible evaluation

## Design

This is a document-grounded extraction and refusal benchmark, not a price forecast or investment backtest. Both systems see the same question and the same set of 30 original research PDFs. The non-AI baseline returns a lexical top passage and its best matching sentence. The final system retrieves page-marked passages, calls a backend AI model, and checks generated citations and numbers before returning an evidence state.

The 12 development questions use reports from March through August 2024. Chunk size, retrieval count, prompt wording, evidence rules, and lexical normalization were revised using development results only. A development example with conflicting figures in a report's contents list and body was replaced with a clearly answerable development item, and this change is archived in the earlier development logs. No final holdout predictions were consulted during configuration selection.

The holdout question file contains 50 source-quote-checked candidate labels from reports dated September 2024 onward. It has exactly 40 answerable numeric questions and 10 no-answer questions. Its SHA256 is pinned in `scripts/evaluate.ts`. A final configuration snapshot is recorded in `FROZEN_CONFIG.json` before running the holdout. Existing predictions cannot be overwritten by the evaluation runner. Never use the holdout as a development set.

## Run

Download the 30 original PDFs as described in `../data/README.md`, then configure a protected backend AI provider. From the project root:

```bash
pnpm test
pnpm eval --split=dev
pnpm eval --split=holdout
```

The runner checks the SHA256 of every PDF against `data/manifest.csv`, parses the real PDF with the same application parser, checks page counts, then runs both systems for each question. It writes per-case answers, citations, judgments, and latency to `eval/results/`, plus a machine-readable summary. If an AI call fails, the run stops without publishing a completed summary. A failed execution must not be counted as a correct abstention.

For the managed Preview, the chosen AI provider is visible in the run summary. The protected school OpenRouter key was not confirmed in project secrets during initial setup, so the measured runs use the project AI fallback. Do not present these measurements as an OpenRouter-specific model benchmark.

## Metric definitions

Let A be the 40 answerable holdout cases. Let N be the 10 no-answer holdout cases.

| Metric | Numerator | Denominator |
| --- | --- | --- |
| Numeric answer accuracy | Supported answers with the expected normalized number and a cited passage in the correct original report containing that number | A |
| Correct abstention rate | Answers marked Insufficient evidence or Needs clarification when the source does not state the requested answer | N |
| Wrongful abstention rate | Answerable cases not marked Supported | A |
| Unsupported answer rate | No-answer cases in any non-abstention evidence state | N |

The baseline's Supported state means that it returned a passage. Its answer is still scored against the same numeric and citation criteria. The numeric scorer recognizes commas, K, M, B and T abbreviations, and the words million and billion. A different page of the correct original report counts if its cited passage contains the same answer. This avoids falsely penalizing a valid alternate quotation of the same number.

The numeric match checks number and source presence, not full semantic equivalence. A passage can contain a number in a different context. Conversely, natural-language paraphrases may fail a strict check. Source-quote validation is not independent human ground truth. Review the raw predictions and source pages, especially any negative case that might be answered by a paraphrase elsewhere in the report. A system that always refuses will score 100 percent on correct abstention but 100 percent on wrongful abstention, so both figures must be displayed together.

## Freeze and interpretation

The holdout file and 30-file manifest were assembled before the final run. Model and retrieval configuration are selected on the development set. `FROZEN_CONFIG.json` stores file checksums and the chosen values before the holdout is attempted. `eval/results/dev_pre_tuning_summary.json` and later development artifacts preserve exploratory iterations rather than silently overwriting them. The final holdout raw predictions are intended to be one formal pass. The student should disclose any technical failure and avoid post-hoc tuning or repeated runs on the holdout.

Report actual observed results, including low accuracy or wrongful abstentions. Do not infer analyst time savings from this benchmark because no timed human comparator was measured. Do not quote an LLM-generated confidence percentage as if it were calibrated.

Two incomplete holdout attempts ended on malformed model JSON at cases 28 and 10, without writing a final summary. Their logs are retained as `eval/results/holdout_interrupted_first.log` and `eval/results/holdout_interrupted_second.log`. The original freeze snapshot is retained as `FROZEN_CONFIG_before_format_retry.json`. A transparent technical amendment retries an identical request only when JSON parsing fails, up to three total requests, while keeping the model, prompts, retrieval, labels, scoring, and abstention rules unchanged. The format retry is an execution-reliability fix, not a score-based adjustment.

After the frozen run, `python3 scripts/summarize_run.py` derives `eval/results/holdout_diagnostics.json` without changing any per-case prediction or metric judgment. It reports 3,553 milliseconds median and 4,993 milliseconds 90th-percentile per-case latency, 48 records with model usage, 107,586 reported prompt tokens, 7,860 completion tokens, 37 correct-report citations among answerable cases, and 34 citations to the label's specific PDF page. Provider USD cost is null because this model route did not supply a reliable price. A matching development diagnostics file is also preserved.

The documented `pnpm eval --split=...` command now acquires an exclusive split-specific file lock before invoking the unchanged frozen scoring script. A second simultaneous run exits rather than creating another set of model calls. Locks are removed on ordinary completion. If a machine crashes, inspect the recorded process ID and any output before deciding whether a leftover lock is stale. Existing completed results still block overwrite.
