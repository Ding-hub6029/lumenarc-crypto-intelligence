#!/usr/bin/env python3
"""Derive transparent supplemental diagnostics from preserved evaluation predictions."""
import json
import math
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / 'eval' / 'results'


def percentile(values, fraction):
    ordered = sorted(values)
    return ordered[max(0, math.ceil(len(ordered) * fraction) - 1)] if ordered else None


def summarize(split, label_by_id):
    raw = RESULTS / f'{split}_predictions.jsonl'
    rows = [json.loads(line) for line in raw.read_text().splitlines() if line.strip()]
    answerable = [row for row in rows if row['expectedType'] == 'numeric']
    positive = [row for row in answerable if row['final']['status'] == 'Supported']
    same_report = [row for row in positive if any(row['reportMonth'] in citation['documentName'] for citation in row['final']['evidence'])]
    source_page = [row for row in positive if any(
        citation['page'] == label_by_id[row['id']]['pdf_page'] and row['reportMonth'] in citation['documentName']
        for citation in row['final']['evidence'])]
    times = [row['elapsedMs'] for row in rows]
    usages = [row['final'].get('usage') for row in rows if row['final'].get('usage')]
    observed_costs = [item['estimatedUsd'] for item in usages if item['estimatedUsd'] is not None]
    return {
        'split': split,
        'cases': len(rows),
        'latencyMedianMs': percentile(times, 0.5),
        'latencyP90Ms': percentile(times, 0.9),
        'latencyMeanMs': round(sum(times) / len(times), 1),
        'modelCallsWithUsage': len(usages),
        'reportedPromptTokens': sum(item['promptTokens'] for item in usages),
        'reportedCompletionTokens': sum(item['completionTokens'] for item in usages),
        'providerUsdCost': round(sum(observed_costs), 6) if len(observed_costs) == len(usages) and usages else None,
        'costCaveat': 'The measured Manus project AI provider did not return a USD price, so this is unknown, not zero.' if len(observed_costs) != len(usages) else None,
        'supportedAnswersWithCorrectReportCitation': len(same_report),
        'supportedAnswersWithLabeledPdfPageCitation': len(source_page),
        'answerableCases': len(answerable),
        'finalStatusCounts': dict(Counter(row['final']['status'] for row in rows)),
        'scoringCaveat': 'A source page citation does not prove the generated answer expresses the correct semantic relationship. Original PDF inspection remains necessary.'
    }


if __name__ == '__main__':
    for split in ('dev', 'holdout'):
        labels = {value['id']: value for line in (ROOT / 'data' / f'{split}_questions.jsonl').read_text().splitlines()
                  if line.strip() for value in [json.loads(line)]}
        output = summarize(split, labels)
        target = RESULTS / f'{split}_diagnostics.json'
        target.write_text(json.dumps(output, indent=2) + '\n')
        print(json.dumps(output))
