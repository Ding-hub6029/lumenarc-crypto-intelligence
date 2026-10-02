import { randomUUID } from 'node:crypto'
import mammoth from 'mammoth'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { Passage, ResearchDocument } from './types.js'

const supported = new Set(['.pdf', '.docx', '.txt', '.md'])

export function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/\.[a-z0-9]+$/)
  return match?.[0] ?? ''
}

export function chunkPages(pages: string[], docId: string, name: string, sourceUrl?: string): Passage[] {
  const chunks: Passage[] = []
  for (let index = 0; index < pages.length; index++) {
    const text = pages[index].replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    if (!text) continue
    const words = text.split(/\s+/)
    let start = 0
    while (start < words.length) {
      let end = start
      let chars = 0
      while (end < words.length && chars < 1050) {
        chars += words[end].length + 1
        end++
      }
      const chunk = words.slice(start, end).join(' ')
      if (chunk.length > 35) {
        chunks.push({ id: `${docId}:p${index + 1}:c${chunks.length + 1}`, documentId: docId, documentName: name, page: index + 1, text: chunk, sourceUrl })
      }
      if (end >= words.length) break
      start = Math.max(start + 1, end - 32)
    }
  }
  return chunks
}

export async function extractDocument(bytes: Buffer, originalName: string, sourceUrl?: string): Promise<ResearchDocument> {
  const name = originalName.replace(/[\\/\x00-\x1f]/g, '_').slice(0, 150)
  const format = extensionOf(name)
  if (!supported.has(format)) throw new Error('Unsupported format. Upload PDF, DOCX, TXT or Markdown.')
  if (bytes.length > 18 * 1024 * 1024) throw new Error('Document exceeds the 18 MB limit.')
  if (!bytes.length) throw new Error('The document is empty.')
  let pages: string[] = []
  if (format === '.pdf') {
    if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF signature.')
    const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false }).promise
    try {
      if (pdf.numPages > 250) throw new Error('PDF exceeds the 250 page limit.')
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo)
        const content = await page.getTextContent()
        pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' '))
        page.cleanup()
      }
    } finally {
      await pdf.destroy()
    }
  } else if (format === '.docx') {
    const result = await mammoth.extractRawText({ buffer: bytes })
    pages = [result.value]
  } else {
    pages = [bytes.toString('utf8')]
  }
  const characters = pages.reduce((total, page) => total + page.trim().length, 0)
  if (characters < 75) throw new Error(format === '.pdf' ? 'No usable text found. This may be a scanned PDF requiring OCR.' : 'No usable text found in the document.')
  const id = randomUUID()
  const passages = chunkPages(pages, id, name, sourceUrl)
  if (!passages.length) throw new Error('No searchable text passages were extracted.')
  return { id, name, format, sourceUrl, addedAt: new Date().toISOString(), pageCount: pages.length, characterCount: characters, passages }
}
