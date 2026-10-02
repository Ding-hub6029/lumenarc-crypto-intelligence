import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractDocument } from '../server/documents.js'
import { answerQuestion, budgetStatus } from '../server/ai.js'
import { keywordBaseline } from '../server/search.js'
import type { Answer, ResearchDocument } from '../server/types.js'

type Case = { id: string; split: string; question: string; answer: string; answer_type: 'numeric' | 'no_answer'; report_month: string; source_url: string; evidence_quote: string; pdf_page: number; label_status: string }
type CaseResult = { id: string; question: string; expected: string; expectedType: string; reportMonth: string; baseline: Answer; final: Answer; baselineJudgment: string; finalJudgment: string; elapsedMs: number; error?: string }

const root = resolve(process.cwd())
const split = process.argv.includes('--split=holdout') ? 'holdout' : 'dev'
const expectSha = split === 'holdout' ? 'd92c4deb2ab3d76fcea61e3ee873768762c0375ccf1d43eb48d25b091ad97d57' : 'e3e162e9926b5881eaedb04698acd2e3c9bcca5c57bbd8cca429961bf284a26c'
const labelsPath = resolve(root, `data/${split}_questions.jsonl`)
const resultDir = resolve(root, 'eval/results')
const resultPath = resolve(resultDir, `${split}_predictions.jsonl`)
const summaryPath = resolve(resultDir, `${split}_summary.json`)
if (existsSync(resultPath) || existsSync(summaryPath)) throw new Error(`${split} evaluation output already exists. Keep frozen results unchanged.`)
const labelsBytes = await readFile(labelsPath)
const labelSha256 = createHash('sha256').update(labelsBytes).digest('hex')
if (labelSha256 !== expectSha) throw new Error('Question labels changed after freeze. Do not evaluate this modified set.')
const cases = labelsBytes.toString('utf8').trim().split('\n').map(line => JSON.parse(line) as Case)
if (cases.length !== (split === 'holdout' ? 50 : 12)) throw new Error('Unexpected case count.')
const manifest = (await readFile(resolve(root, 'data/manifest.csv'), 'utf8')).trim().split('\n').slice(1).map(line => line.split(','))
if (manifest.length !== 30 || manifest.some(row => row[7] !== 'verified_pdf')) throw new Error('The 30-report manifest is incomplete.')

function numberCandidates(text: string): number[] {
  const normalized = text.toLowerCase().replace(/\b(thousand|million|billion|trillion)\b/g, word => ({ thousand: 'k', million: 'm', billion: 'b', trillion: 't' })[word] ?? word)
  const matches = normalized.matchAll(/(?<![\p{L}\p{N}])(?:us\s*)?\$?\s*([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*([kmbt])s?\b)?\s*%?/gu)
  const numbers = [...matches].map(match => Number(match[1].replaceAll(',', '')) * ({ k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[match[2] || ''] ?? 1))
  if (/\bsix\b/.test(normalized)) numbers.push(6)
  return numbers
}

function judgment(label: Case, result: Answer): string {
  if (label.answer_type === 'no_answer') return result.status === 'Insufficient evidence' || result.status === 'Needs clarification' ? 'correct_abstention' : 'unsupported_answer'
  if (result.status !== 'Supported') return 'wrongful_abstention'
  const expected = numberCandidates(label.answer)[0]
  const actual = numberCandidates(result.answer)
  if (expected === undefined) return 'unscored'
  const matching = actual.some(value => Math.abs(value - expected) <= Math.max(1e-6, Math.abs(expected) * 0.0001))
  const citedSource = result.evidence.some(passage => passage.documentName.includes(label.report_month) &&
    numberCandidates(passage.text).some(value => Math.abs(value - expected) <= Math.max(1e-6, Math.abs(expected) * 0.0001)))
  return matching && citedSource ? 'correct_numeric_and_source' : 'wrong_or_unverified_numeric'
}

function summarize(results: CaseResult[], system: 'baseline' | 'final') {
  const key = system === 'baseline' ? 'baselineJudgment' : 'finalJudgment'
  const counts: Record<string, number> = {}
  for (const item of results) counts[item[key]] = (counts[item[key]] ?? 0) + 1
  const answered = results.filter(item => item.expectedType === 'numeric')
  const shouldAbstain = results.filter(item => item.expectedType === 'no_answer')
  const ratio = (a: number, b: number) => b ? Number((a / b).toFixed(4)) : null
  return {
    counts,
    numberAccuracy: ratio(counts.correct_numeric_and_source || 0, answered.length),
    correctAbstentionRate: ratio(counts.correct_abstention || 0, shouldAbstain.length),
    wrongfulAbstentionRate: ratio(counts.wrongful_abstention || 0, answered.length),
    unsupportedAnswerRate: ratio(counts.unsupported_answer || 0, shouldAbstain.length),
    answeredCases: answered.length,
    noAnswerCases: shouldAbstain.length
  }
}

console.log(JSON.stringify({ phase: 'parsing_source_pdfs', count: manifest.length, split, frozenLabelSha256: labelSha256 }))
const documents: ResearchDocument[] = []
for (const [index, row] of manifest.entries()) {
  const pdfPath = resolve(root, 'data', row[2])
  const bytes = await readFile(pdfPath)
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (digest !== row[3]) throw new Error(`SHA256 mismatch for ${row[0]}`)
  const doc = await extractDocument(bytes, `monthly-market-insights-${row[0]}.pdf`, row[1])
  if (doc.pageCount !== Number(row[4])) throw new Error(`PDF page count mismatch for ${row[0]}`)
  documents.push(doc)
  if ((index + 1) % 5 === 0) console.log(JSON.stringify({ phase: 'parsed', documents: index + 1, passages: documents.reduce((n, d) => n + d.passages.length, 0) }))
}
await mkdir(resultDir, { recursive: true })
const startedAt = new Date().toISOString()
const results: CaseResult[] = []
for (const [index, label] of cases.entries()) {
  const baseline = keywordBaseline(label.question, documents)
  let final: Answer
  let error: string | undefined
  const started = Date.now()
  try { final = await answerQuestion(label.question, documents, 'en') }
  catch (cause) {
    error = cause instanceof Error ? cause.message : 'Unknown AI error'
    final = { status: 'Insufficient evidence', answer: "I don't know. The AI service failed.", evidence: [], note: 'Evaluation error, not a successful abstention.' }
  }
  const record: CaseResult = { id: label.id, question: label.question, expected: label.answer, expectedType: label.answer_type, reportMonth: label.report_month,
    baseline, final, baselineJudgment: judgment(label, baseline), finalJudgment: error ? 'execution_error' : judgment(label, final), elapsedMs: Date.now() - started, ...(error ? { error } : {}) }
  results.push(record)
  console.log(JSON.stringify({ phase: 'case_complete', case: index + 1, total: cases.length, id: label.id, baseline: record.baselineJudgment, final: record.finalJudgment, elapsedMs: record.elapsedMs }))
  if (error) throw new Error(`Evaluation interrupted at ${label.id}: ${error}. No final results were written.`)
}
const summary = {
  split, startedAt, completedAt: new Date().toISOString(), frozenLabelSha256: labelSha256, reportCount: documents.length,
  reportMonths: documents.map(doc => doc.name.match(/\d{4}-\d{2}/)?.[0]), parsedPages: documents.reduce((total, doc) => total + doc.pageCount, 0),
  parsedPassages: documents.reduce((total, doc) => total + doc.passages.length, 0), devAndHoldoutUseDisjointReportMonths: true,
  cases: cases.length, provider: budgetStatus().provider, model: budgetStatus().model,
  scoring: 'Numeric match in answer AND matching numeric evidence in a cited passage from the labeled original PDF. A different report page with the same figure is accepted. Qualitative phrasing and negative-label ambiguity still require manual review.',
  baseline: summarize(results, 'baseline'), final: summarize(results, 'final')
}
await writeFile(resultPath, results.map(item => JSON.stringify(item)).join('\n') + '\n', { flag: 'wx' })
await writeFile(summaryPath, JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ phase: 'finished', split, summary }, null, 2))
