import { type Token, type Tokens } from 'marked'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfContent = any
type InlineRun = string | Record<string, unknown>

function inlineRuns(tokens: Token[]): InlineRun[] {
  const runs: InlineRun[] = []
  for (const tok of tokens) {
    switch (tok.type) {
      case 'text': {
        const t = tok as Tokens.Text
        if (t.tokens?.length) {
          runs.push(...inlineRuns(t.tokens))
        } else {
          runs.push(t.text)
        }
        break
      }
      case 'strong': {
        const inner = inlineRuns((tok as Tokens.Strong).tokens ?? [])
        runs.push(...inner.map(r => typeof r === 'string' ? { text: r, bold: true } : { ...r, bold: true }))
        break
      }
      case 'em': {
        const inner = inlineRuns((tok as Tokens.Em).tokens ?? [])
        runs.push(...inner.map(r => typeof r === 'string' ? { text: r, italics: true } : { ...r, italics: true }))
        break
      }
      case 'link': {
        const t = tok as Tokens.Link
        const inner = inlineRuns(t.tokens ?? [])
        const text = inner.map(r => typeof r === 'string' ? r : (r.text as string)).join('')
        runs.push({ text, link: t.href, color: '#111111' })
        break
      }
      case 'codespan':
        runs.push((tok as Tokens.Codespan).text)
        break
      case 'br':
        runs.push('\n')
        break
      case 'html':
        // Float:right spans are handled at paragraph level — skip here
        break
    }
  }
  return runs
}

function detectFloatRight(tokens: Token[]): { left: Token[]; rightText: string } | null {
  const openIdx = tokens.findIndex(t => t.type === 'html' && /float\s*:\s*right/i.test(t.raw))
  if (openIdx === -1) return null

  // marked splits <span style="float:right">text</span> into three tokens:
  // opening html tag, text content, closing html tag — collect until </span>
  const parts: string[] = []
  let closeIdx = -1
  for (let i = openIdx + 1; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'html' && /<\/span>/i.test(t.raw)) {
      closeIdx = i
      break
    }
    if (t.type === 'text') parts.push((t as Tokens.Text).text)
  }

  // Fallback: try single-token form <span ...>content</span>
  if (closeIdx === -1) {
    const m = tokens[openIdx].raw.match(/<span[^>]*>([\s\S]*?)<\/span>/i)
    if (!m) return null
    return { left: tokens.slice(0, openIdx), rightText: m[1].trim() }
  }

  return { left: tokens.slice(0, openIdx), rightText: parts.join('').trim() }
}

function makeBlock(tokens: Token[], style: string): PdfContent {
  const split = detectFloatRight(tokens)
  if (split) {
    return {
      columns: [
        { text: inlineRuns(split.left), width: '*', style },
        { text: split.rightText, width: 'auto', alignment: 'right', style },
      ],
      margin: [0, 0, 0, 4],
    }
  }
  return { text: inlineRuns(tokens), style }
}

function listItemInlines(item: Tokens.ListItem): Token[] {
  const first = item.tokens[0]
  if (!first) return []
  if (first.type === 'text') return (first as Tokens.Text).tokens ?? []
  if (first.type === 'paragraph') return (first as Tokens.Paragraph).tokens ?? []
  return []
}

export function markdownToPdfmake(tokens: Token[], usableWidth: number): PdfContent[] {
  const content: PdfContent[] = []

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const tok = token as Tokens.Heading
        const style = tok.depth === 1 ? 'h1' : tok.depth === 2 ? 'h2' : 'h3'
        content.push(makeBlock(tok.tokens ?? [], style))
        if (tok.depth === 2) {
          content.push({
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: usableWidth, y2: 0, lineWidth: 0.5, lineColor: '#aaaaaa' }],
            margin: [0, 1, 0, 3],
          })
        }
        break
      }

      case 'paragraph': {
        const tok = token as Tokens.Paragraph
        content.push(makeBlock(tok.tokens ?? [], 'paragraph'))
        break
      }

      case 'list': {
        const tok = token as Tokens.List
        const items = tok.items.map(item => ({
          text: inlineRuns(listItemInlines(item)),
          margin: [0, 0, 0, 1],
        }))
        content.push({ ul: items, style: 'list', margin: [0, 1, 0, 4] })
        break
      }

      case 'hr':
        content.push({
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: usableWidth, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }],
          margin: [0, 4, 0, 4],
        })
        break

      case 'html': {
        // Block-level HTML — extract float:right date if present
        const tok = token as Tokens.HTML
        const m = tok.raw.match(/<span[^>]*float\s*:\s*right[^>]*>([\s\S]*?)<\/span>/i)
        if (m) {
          content.push({ text: m[1].trim(), style: 'paragraph', alignment: 'right' })
        }
        break
      }

      case 'space':
        break
    }
  }

  return content
}
