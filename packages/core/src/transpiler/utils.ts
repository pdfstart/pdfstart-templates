import type {
  Definition,
  FootnoteDefinition,
  Heading,
  InlineCode,
  Link,
  LinkReference,
  PhrasingContent,
  Root,
  Strong,
  Text,
} from 'mdast'
import { EMOJI_MAP } from './emojis'
import type { RenderableNode } from './types'

export function collectDefinitions(root: Root): Map<string, Definition> {
  const definitions = new Map<string, Definition>()
  for (const node of root.children) {
    if (node.type !== 'definition') continue
    const def = node as Definition
    definitions.set(def.identifier.toLowerCase(), def)
  }
  return definitions
}

export function collectFootnotes(root: Root): Map<string, FootnoteDefinition> {
  const definitions = new Map<string, FootnoteDefinition>()
  for (const node of root.children) {
    if (node.type !== 'footnoteDefinition') continue
    const def = node as FootnoteDefinition
    definitions.set(def.identifier.toLowerCase(), def)
  }
  return definitions
}

export function findLeadingH1(
  root: Root,
  definitions: Map<string, Definition>
): { title: string; index: number } | null {
  for (let i = 0; i < root.children.length; i++) {
    const node = root.children[i]
    if (node.type === 'yaml' || node.type === 'definition') continue
    if (node.type !== 'heading') return null
    const heading = node as Heading
    if (heading.depth !== 1) return null
    const title = plainTextFromPhrasing(heading.children, definitions).trim()
    return title ? { title, index: i } : null
  }
  return null
}

export function plainTextFromPhrasing(
  nodes: PhrasingContent[],
  definitions: Map<string, Definition>
): string {
  return nodes
    .map((node) => plainTextFromPhrasingNode(node, definitions))
    .join('')
}

export function plainTextFromPhrasingNode(
  node: PhrasingContent,
  definitions: Map<string, Definition>
): string {
  switch (node.type) {
    case 'text':
      return (node as Text).value
    case 'strong':
    case 'emphasis':
      return plainTextFromPhrasing((node as Strong).children, definitions)
    case 'inlineCode':
      return (node as InlineCode).value
    case 'link':
      return plainTextFromPhrasing((node as Link).children, definitions)
    case 'linkReference': {
      const lr = node as LinkReference
      const label = plainTextFromPhrasing(lr.children, definitions)
      if (label.trim()) return label
      const def = definitions.get(lr.identifier.toLowerCase())
      return def ? def.url : lr.label || lr.identifier
    }
    case 'break':
      return '\n'
    default:
      return ''
  }
}

export function normalizeText(value: string | null): string {
  return (value ?? '').trim()
}

export function renderTypstArray(items: string[]): string {
  if (items.length === 1) return `(${items[0]},)`
  return `(${items.join(', ')})`
}

export function escapeTypstText(input: string): string {
  return input.replace(/[\\#*_`[\]$<>@]/g, (c) => `\\${c}`)
}

export function escapeTypstString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/#/g, '\\#')
}

export function indentLines(text: string, indentLevel: number): string {
  if (!indentLevel) return text
  const indent = '  '.repeat(indentLevel)
  return text
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n')
}

export function isNonEmpty(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0
}

export function replaceEmojiShortcodes(text: string): string {
  return text.replace(/:([a-z0-9_+-]+):/g, (match, name) => {
    return EMOJI_MAP[name.toLowerCase()] ?? match
  })
}

const EMOJI_SEQ_REGEX =
  /(?:[0-9#*]\uFE0F?\u20E3|(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})(?:\p{Emoji_Modifier})?)(?:\u200D(?:[0-9#*]\uFE0F?\u20E3|(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})(?:\p{Emoji_Modifier})?))*/gu

export function emojiToCodePoints(emoji: string): string {
  const codePoints: string[] = []
  for (const char of emoji) {
    const cp = char.codePointAt(0)
    if (cp !== undefined) {
      codePoints.push(cp.toString(16))
    }
  }
  return codePoints.filter((cp) => cp !== 'fe0f').join('-')
}

export function replaceEmojisWithImages(text: string): string {
  return text.replace(EMOJI_SEQ_REGEX, (match) => {
    const cp = emojiToCodePoints(match)
    return `#box(image("emojis/${cp}.svg", height: 1.2em), baseline: 12%)`
  })
}
