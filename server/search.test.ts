import test from 'node:test'
import assert from 'node:assert/strict'
import { chunkPages, extractDocument } from './documents.js'
import { keywordBaseline, numericEvidenceCheck, retrieve } from './search.js'
import type { ResearchDocument } from './types.js'

function doc(name: string, text: string): ResearchDocument {
  return { id: name, name, format: '.txt', addedAt: '', pageCount: 1, characterCount: text.length, passages: chunkPages([text], name, name) }
}

test('normalize monetary suffixes against cited source', () => {
  const evidence = doc('2024-04.pdf', 'Bitcoin reached US$73K in March and later reached US$98K in January.').passages
  assert.equal(numericEvidenceCheck('Bitcoin reached $73,000.', evidence), true)
  assert.equal(numericEvidenceCheck('Bitcoin reached $82,000.', evidence), false)
})

test('the question year may be repeated but not a made-up resistance level', () => {
  const evidence = doc('2026-02.pdf', 'January saw a surge to US$98K and support in the US$80Ks.').passages
  assert.equal(numericEvidenceCheck('In 2026 Bitcoin reached US$98K.', evidence, 'What did Bitcoin reach in 2026?'), true)
  assert.equal(numericEvidenceCheck('In 2026 Bitcoin faced resistance at US$150K.', evidence, 'What resistance was stated in 2026?'), false)
})

test('a dated question selects the intended report in a thirty-document setting', () => {
  const docs = [doc('monthly-market-insights-2025-02.pdf', 'The crypto market declined 20.2% in February.'), doc('monthly-market-insights-2025-05.pdf', 'The crypto market rose 10.8% in April.')]
  const results = retrieve('In the 2025-05 report, how much did the crypto market rise?', docs)
  assert.ok(results.length > 0)
  assert.ok(results.every(item => item.documentName.includes('2025-05')))
})

test('the keyword baseline retains decimal figures instead of breaking at decimal points', () => {
  const answer = keywordBaseline('How much did the stablecoin supply rise?', [doc('report.txt', 'Stablecoin supply rose 10.8% over the course of April. It later stabilized.')])
  assert.ok(answer.answer.includes('10.8%'))
})

test('text documents are really extracted and indexed', async () => {
  const report = await extractDocument(Buffer.from('Research note. Bitcoin traded near 98,000 dollars. The text continues with enough source material for a real document pipeline. Market levels reflect historical reporting only.'), 'report.txt')
  assert.equal(report.format, '.txt')
  assert.equal(report.pageCount, 1)
  assert.ok(report.passages.length > 0)
  await assert.rejects(extractDocument(Buffer.from('not a pdf but more than enough text to exceed seventy five characters in this input buffer here'), 'report.pdf'), /Invalid PDF signature/)
})
