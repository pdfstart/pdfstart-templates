import type { RenderableNode } from './types'

export const EXTRA_BLANK_LINE_TOKEN = '[[mdxport-blank-line]]'

export function splitSegments(
  nodes: RenderableNode[]
): Array<{ nodes: RenderableNode[]; explicit: boolean }> {
  const segments: Array<{ nodes: RenderableNode[]; explicit: boolean }> = [
    { nodes: [], explicit: false },
  ]

  for (const node of nodes) {
    if (isSegmentBreak(node)) {
      segments.push({ nodes: [], explicit: true })
      continue
    }
    segments[segments.length - 1].nodes.push(node)
  }
  return segments
}

function isSegmentBreak(node: RenderableNode): boolean {
  return node.type === 'pageBreak'
}

export function injectExtraBlankLineTokens(markdown: string): string {
  let frontmatter = ''
  let body = markdown

  const yamlMatch = /^(?:---\r?\n([\s\S]*?)\r?\n---)/.exec(markdown)
  if (yamlMatch) {
    frontmatter = yamlMatch[0] + '\n'
    body = markdown.slice(yamlMatch[0].length)
  }

  if (!body.trim()) {
    return markdown
  }

  const lines = body.split(/\r?\n/)
  const result: string[] = []
  let activeFence: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fenceMatch = /^(\s*)(`{3,}|~{3,})/.exec(line)
    if (fenceMatch) {
      const marker = fenceMatch[2][0]
      if (!activeFence) {
        activeFence = marker
      } else if (activeFence === marker) {
        activeFence = null
      }
      result.push(line)
      continue
    }

    if (activeFence) {
      result.push(line)
      continue
    }

    if (line.trim() !== '') {
      result.push(line)
      continue
    }

    let j = i
    while (j < lines.length && lines[j].trim() === '') j++
    const blankCount = j - i
    const previousLine = result.length > 0 ? result[result.length - 1] : ''
    const nextLine = j < lines.length ? lines[j] : ''
    const canInsertSpacer =
      blankCount > 1 &&
      shouldPreserveExtraBlankLines(previousLine) &&
      shouldPreserveExtraBlankLines(nextLine)

    result.push('')
    if (canInsertSpacer) {
      for (let extra = 1; extra < blankCount; extra++) {
        result.push(EXTRA_BLANK_LINE_TOKEN, '')
      }
    }
    i = j - 1
  }

  return frontmatter + result.join('\n')
}

function shouldPreserveExtraBlankLines(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (/^(`{3,}|~{3,})/.test(trimmed)) return false
  if (/^([*-+]|\d+\.)\s/.test(trimmed)) return false
  if (/^>/.test(trimmed)) return false
  if (/^\|/.test(trimmed)) return false
  if (/^#{1,6}\s/.test(trimmed)) return true
  if (/^\[\[pagebreak\]\]$/i.test(trimmed)) return false
  return !/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)
}
