import type { Answer, Passage, ResearchDocument } from './types.js'

const stop = new Set('the a an is are was were what which who whose how much of in on at to for from with about did does do have has had report reports according stated state level price market crypto bitcoin ethereum and or by show give tell me please current historical specific'.split(' '))
const synonyms: Record<string, string[]> = { rise: ['rose', 'increased', 'increase'], rose: ['rise', 'increased'], grow: ['grew', 'growth'], grew: ['grow', 'growth'], fall: ['fell', 'declined'], fell: ['fall', 'declined'], drop: ['fell', 'declined', 'decrease'] }

export function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(token => token.length > 1 && !stop.has(token))
}

export function retrieve(query: string, docs: ResearchDocument[], limit = 6): Passage[] {
  const terms = tokenize(query.replace(/\b20\d{2}-(?:0[1-9]|1[0-2])\b/g, ''))
  if (!terms.length) return []
  const groups = [...new Set(terms)].map(term => [term, ...(synonyms[term] || [])])
  const requestedMonth = query.match(/\b20\d{2}-(?:0[1-9]|1[0-2])\b/)?.[0]
  const selected = requestedMonth ? docs.filter(doc => doc.name.includes(requestedMonth)) : docs
  const candidates = selected.length ? selected : docs
  const scored = candidates.flatMap(doc => doc.passages).map(passage => {
    const words = tokenize(passage.text)
    const counts = new Map<string, number>()
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1)
    const matched = groups.filter(group => group.some(word => counts.has(word))).length
    const score = groups.reduce((sum, group) => sum + Math.min(Math.max(...group.map(word => counts.get(word) ?? 0)), 4) / (1 + Math.log(1 + words.length / 80)), 0)
    return { ...passage, score: matched < 1 ? 0 : score + 2 * matched / groups.length }
  })
  return scored.filter(passage => passage.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}

export function keywordBaseline(query: string, docs: ResearchDocument[]): Answer {
  const passages = retrieve(query, docs, 1)
  if (!passages.length) return { status: 'Insufficient evidence', answer: "I don't know. Keyword search found no matching passage.", evidence: [], note: 'Deterministic keyword baseline, no AI generation.' }
  const passage = passages[0]
  const sentences = passage.text.split(/(?<=[.!?])\s+(?=[A-Z◆])/u)
  const terms = tokenize(query)
  const best = sentences.map(text => ({ text: text.trim(), overlap: terms.filter(term => text.toLowerCase().includes(term)).length }))
    .sort((a, b) => b.overlap - a.overlap)[0]
  return { status: 'Supported', answer: best.text.slice(0, 460), evidence: [passage], note: 'Top matching passage, not a verified semantic answer. This is the non-AI baseline.' }
}

export function normalizeNumber(value: string): string {
  return value.replace(/,/g, '').replace(/^0+(?=\d)/, '').replace(/\.0+$/, '')
}

function numericClaims(text: string): { value: number; percent: boolean; money: boolean }[] {
  const units: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, billion: 1e9, t: 1e12, trillion: 1e12 }
  const claims: { value: number; percent: boolean; money: boolean }[] = []
  const regex = /(?<![\p{L}\p{N}])(?:US\s*)?(\$?)\s*([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*(thousand|million|billion|trillion)\b|([KMBT])s?\b)?(%?)/giu
  for (const match of text.matchAll(regex)) {
    const number = Number(match[2].replaceAll(',', ''))
    if (!Number.isFinite(number)) continue
    claims.push({ value: number * (units[(match[3] || match[4] || '').toLowerCase()] ?? 1), percent: match[5] === '%', money: match[1] === '$' })
  }
  return claims
}

export function numericEvidenceCheck(answer: string, sources: Passage[], question = ''): boolean {
  const numbers = numericClaims(answer)
  if (!numbers.length) return true
  const cited = sources.flatMap(passage => numericClaims(passage.text + ' ' + passage.documentName))
  const questionYears = new Set((question.match(/\b(?:19|20)\d{2}\b/g) ?? []).map(Number))
  return numbers.every(claim => questionYears.has(claim.value) || cited.some(source =>
    Math.abs(source.value - claim.value) <= Math.max(1e-6, Math.abs(claim.value) * 0.0001)
    && (!claim.percent || source.percent)
    && (!claim.money || source.money)
  ))
}
