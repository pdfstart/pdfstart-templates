import type {
  Blockquote,
  Code,
  Delete,
  Emphasis,
  FootnoteReference,
  Heading,
  Html,
  Image,
  InlineCode,
  Link,
  LinkReference,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
} from 'mdast'
import { tex2typst } from 'tex2typst'
import { mermaidGanttToGantty } from '../mermaidGanttToGantty'
import { EXTRA_BLANK_LINE_TOKEN, splitSegments } from './segmenter'
import type {
  InlineMathNode,
  Mark,
  MathNode,
  PageBreakNode,
  SubScript,
  SuperScript,
  TranspileContext,
} from './types'
import {
  escapeTypstString,
  escapeTypstText,
  indentLines,
  isNonEmpty,
  plainTextFromPhrasing,
  replaceEmojiShortcodes,
  replaceEmojisWithImages,
} from './utils'

export function renderSegmentedBody(
  nodes: RootContent[],
  context: TranspileContext
): string {
  const segments = splitSegments(nodes)
  return segments
    .map((segment) => {
      const rendered = segment.nodes
        .map((node) => renderBlock(node, 0, context))
        .filter(isNonEmpty)
        .join('\n\n')
      if (rendered.trim() !== '') return rendered
      return segment.explicit ? '#v(1pt)' : ''
    })
    .filter((segment) => segment !== '')
    .join('\n\n#pagebreak()\n\n')
}

export function renderBlock(
  node: RootContent,
  indentLevel: number,
  context: TranspileContext
): string | null {
  switch (node.type) {
    case 'yaml':
    case 'definition':
    case 'footnoteDefinition':
      return null
    case 'heading':
      return renderHeading(node, indentLevel, context)
    case 'paragraph':
      return indentLines(renderParagraph(node, context), indentLevel)
    case 'list':
      return renderList(node, indentLevel, context)
    case 'code':
      return renderCodeBlock(node, indentLevel)
    case 'blockquote':
      return renderBlockquote(node, indentLevel, context)
    case 'pageBreak':
      return renderPageBreak(node, indentLevel)
    case 'thematicBreak':
      return indentLines('#line(length: 100%, stroke: 0.6pt)', indentLevel)
    case 'table':
      return renderTable(node, indentLevel, context)
    case 'math':
      return renderMathBlock(node, indentLevel)
    default:
      return null
  }
}

function renderMathBlock(node: MathNode, indentLevel: number): string {
  const typstMath = convertLatexToTypst(node.value.trim())
  return indentLines(`$ ${typstMath} $`, indentLevel)
}

function renderPageBreak(_node: PageBreakNode, indentLevel: number): string {
  return indentLines('#pagebreak()', indentLevel)
}

function convertLatexToTypst(latex: string): string {
  try {
    return tex2typst(latex)
  } catch {
    return latex
  }
}

function renderHeading(
  node: Heading,
  indentLevel: number,
  context: TranspileContext
): string {
  const level = Math.min(Math.max(node.depth, 1), 6)
  return indentLines(
    `${'='.repeat(level)} ${renderInlines(node.children, context)}`,
    indentLevel
  )
}

function renderParagraph(node: Paragraph, context: TranspileContext): string {
  const text = plainTextFromPhrasing(node.children, context.definitions)
    .trim()
    .toLowerCase()
  if (text === '[toc]') {
    return `#outline(title: auto, indent: auto)`
  }
  if (text === EXTRA_BLANK_LINE_TOKEN) {
    return `#v(${spacerHeightForCurrentLayout(context)})`
  }
  return renderInlines(node.children, context)
}

function spacerHeightForCurrentLayout(context: TranspileContext): string {
  const { density, size } = context
  if (density === 'tight') {
    return size === 'large' ? '0.45em' : size === 'regular' ? '0.4em' : '0.35em'
  }
  if (density === 'relaxed') {
    return size === 'large' ? '0.8em' : size === 'regular' ? '0.72em' : '0.64em'
  }
  return size === 'large' ? '0.62em' : size === 'regular' ? '0.56em' : '0.5em'
}

function renderList(
  node: List,
  indentLevel: number,
  context: TranspileContext
): string {
  const marker = node.ordered ? '+' : '-'
  const isChecklist =
    !node.ordered &&
    node.children.some(
      (child) =>
        child.type === 'listItem' &&
        child.checked !== undefined &&
        child.checked !== null
    )

  const baseIndent = '  '.repeat(indentLevel)

  if (isChecklist) {
    const itemsContent = node.children
      .map((item) => renderListItem(item, marker, indentLevel + 1, context))
      .filter(isNonEmpty)
      .join('\n')
    return `${baseIndent}#[\n${baseIndent}  #set list(marker: none, body-indent: 0pt)\n${itemsContent}\n${baseIndent}]`
  }

  // Restore default bullet markers for nested regular lists (prevent inheriting marker: none)
  if (indentLevel > 0) {
    const itemsContent = node.children
      .map((item) => renderListItem(item, marker, indentLevel + 1, context))
      .filter(isNonEmpty)
      .join('\n')
    return `${baseIndent}#[\n${baseIndent}  #set list(marker: auto)\n${itemsContent}\n${baseIndent}]`
  }

  const itemsContent = node.children
    .map((item) => renderListItem(item, marker, indentLevel, context))
    .filter(isNonEmpty)
    .join('\n')

  return itemsContent
}

function renderListItem(
  node: ListItem,
  marker: string,
  indentLevel: number,
  context: TranspileContext
): string {
  const baseIndent = '  '.repeat(indentLevel)
  const nestedIndentLevel = indentLevel + 1

  const first = node.children[0]
  const lines: string[] = []

  let prefix = ''
  if (node.checked === true) {
    prefix =
      '#context { let h = measure([H]).height; box(width: 0.85em, height: 0.85em, stroke: 0.8pt, radius: 1.5pt, baseline: 0.425em - h / 2, align(center + horizon)[#sym.checkmark]) } '
  } else if (node.checked === false) {
    prefix =
      '#context { let h = measure([H]).height; box(width: 0.85em, height: 0.85em, stroke: 0.8pt, radius: 1.5pt, baseline: 0.425em - h / 2) } '
  }

  if (first?.type === 'paragraph') {
    lines.push(
      `${baseIndent}${marker} ${prefix}${renderParagraph(first, context)}`
    )
    for (const child of node.children.slice(1)) {
      if (child.type === 'list') {
        lines.push(renderList(child, nestedIndentLevel, context))
        continue
      }
      const rendered = renderBlock(child, nestedIndentLevel, context)
      if (rendered) lines.push(rendered)
    }
    return lines.join('\n')
  }

  lines.push(`${baseIndent}${marker} ${prefix}`.trimEnd())
  for (const child of node.children) {
    if (child.type === 'list') {
      lines.push(renderList(child, nestedIndentLevel, context))
      continue
    }
    const rendered = renderBlock(child, nestedIndentLevel, context)
    if (rendered) lines.push(rendered)
  }
  return lines.join('\n')
}

function findLongestBacktickRun(text: string): number {
  let maxRun = 0
  let currentRun = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 96) {
      currentRun++
      if (currentRun > maxRun) maxRun = currentRun
    } else {
      currentRun = 0
    }
  }
  return maxRun
}

function renderCodeBlock(node: Code, indentLevel: number): string {
  const info = node.lang?.trim() ? node.lang.trim() : ''
  const value = node.value.replace(/\n$/, '')

  if (
    info === 'gantt' ||
    (info === 'mermaid' && value.trim().startsWith('gantt'))
  ) {
    try {
      const typstGantt = mermaidGanttToGantty(value)
      return indentLines(typstGantt, indentLevel)
    } catch (err) {
      console.error('Failed to convert Mermaid Gantt to Gantty:', err)
      return indentLines(
        `/* Failed to render Gantt chart: ${err} */`,
        indentLevel
      )
    }
  }

  const maxRun = findLongestBacktickRun(value)
  const fenceLen = Math.max(3, maxRun + 1)
  const fence = '`'.repeat(fenceLen)
  const langTag = info ? info : ''
  const result = `${fence}${langTag}\n${value}\n${fence}`
  return indentLines(result, indentLevel)
}

function renderTable(
  node: Table,
  indentLevel: number,
  context: TranspileContext
): string {
  const rows = node.children as TableRow[]
  if (rows.length === 0) return ''

  const headerRow = rows[0]
  const colCount = headerRow.children.length

  const alignMap: Record<string, string> = {
    left: 'left',
    right: 'right',
    center: 'center',
  }
  const aligns = (node.align ?? []).map((a) => alignMap[a ?? 'left'] ?? 'left')
  const columns = Array(colCount).fill('1fr').join(', ')

  const headerCells: string[] = []
  for (const cell of headerRow.children as TableCell[]) {
    const content = renderInlines(cell.children, context)
    headerCells.push(`[*${content}*]`)
  }

  const dataCells: string[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    for (const cell of row.children as TableCell[]) {
      const content = renderInlines(cell.children, context)
      dataCells.push(`[${content}]`)
    }
  }

  const alignArgs = aligns
    .slice(0, colCount)
    .map((a) => a)
    .join(', ')

  const lines = [
    `#table(`,
    `  columns: (${columns}),`,
    `  align: (${alignArgs}),`,
    `  table.header(${headerCells.join(', ')}),`,
    `  ${dataCells.join(', ')}`,
    `)`,
  ]

  return indentLines(lines.join('\n'), indentLevel)
}

function renderBlockquote(
  node: Blockquote,
  indentLevel: number,
  context: TranspileContext
): string {
  const body = node.children
    .map((child) => renderBlock(child, 0, context))
    .filter(isNonEmpty)
    .join('\n\n')

  const open = indentLines('#quote[', indentLevel)
  if (!body.trim()) return `${open}\n${indentLines(']', indentLevel)}`

  return [
    open,
    indentLines(body, indentLevel + 1),
    indentLines(']', indentLevel),
  ].join('\n')
}

export function renderInlines(
  nodes: PhrasingContent[],
  context: TranspileContext
): string {
  return nodes
    .map((node) => renderInline(node, context))
    .filter(isNonEmpty)
    .join('')
}

export function renderInline(
  node: PhrasingContent,
  context: TranspileContext
): string | null {
  switch (node.type) {
    case 'text':
      return renderTextNode(node.value)
    case 'strong':
      return `#strong[${renderInlines(node.children, context)}]`
    case 'emphasis':
      return `#emph[${renderInlines(node.children, context)}]`
    case 'delete':
      return `#strike[${renderInlines(node.children, context)}]`
    case 'mark':
      return `#highlight[${renderInlines(node.children, context)}]`
    case 'subscript':
      return `#sub[${renderInlines(node.children, context)}]`
    case 'superscript':
      return `#super[${renderInlines(node.children, context)}]`
    case 'footnoteReference': {
      const def = context.footnoteDefinitions.get(node.identifier.toLowerCase())
      if (!def) return ''
      const content = def.children
        .map((child) => renderBlock(child, 0, context))
        .filter(isNonEmpty)
        .join(' ')
      return `#footnote[${content.trim()}]`
    }
    case 'inlineCode':
      return renderInlineCode(node)
    case 'inlineMath':
      return `$${convertLatexToTypst(node.value.trim())}$`
    case 'image':
      return renderImage(node)
    case 'link':
      return renderLink(node, context)
    case 'linkReference':
      return renderLinkReference(node, context)
    case 'break':
      return '\\\n'
    case 'html':
      return escapeTypstText(node.value)
    default:
      return null
  }
}

function renderInlineCode(node: InlineCode): string {
  const value = node.value.replace(/`/g, '\\`')
  return `\`${value}\``
}

function renderTextNode(value: string): string {
  return replaceEmojiShortcodes(value)
    .split('\n')
    .map((part) => replaceEmojisWithImages(escapeTypstText(part)))
    .join('\\\n')
}

function renderImage(node: Image): string {
  if (node.url.startsWith('gantt:')) {
    try {
      const b64 = node.url.substring(6)
      let decoded = ''
      if (typeof Buffer !== 'undefined') {
        decoded = Buffer.from(b64, 'base64').toString('utf8')
      } else {
        const binary = atob(b64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        decoded = new TextDecoder().decode(bytes)
      }
      return mermaidGanttToGantty(decoded)
    } catch (err) {
      console.error('Failed to convert Gantt image node to gantty:', err)
      return `/* Failed to render Gantt chart: ${err} */`
    }
  }
  return `#image("${escapeTypstString(node.url)}")`
}

function renderLink(node: Link, context: TranspileContext): string {
  const url = escapeTypstString(node.url)
  const label = renderInlines(node.children, context)
  if (!label.trim()) return `#link("${url}")[${escapeTypstText(node.url)}]`
  return `#link("${url}")[${label}]`
}

function renderLinkReference(
  node: LinkReference,
  context: TranspileContext
): string | null {
  const def = context.definitions.get(node.identifier.toLowerCase())
  const label = renderInlines(node.children, context)
  if (!def) return label || escapeTypstText(node.label || node.identifier)
  const url = escapeTypstString(def.url)
  if (!label.trim()) return `#link("${url}")[${escapeTypstText(def.url)}]`
  return `#link("${url}")[${label}]`
}
