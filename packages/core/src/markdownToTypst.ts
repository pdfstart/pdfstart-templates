import type { Root } from 'mdast'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import remarkPagebreakToken from './plugins/remark-pagebreak-token'
import remarkSimpleMark from './plugins/remark-simple-mark'
import remarkSupersub from './plugins/remark-simple-supersub'
import { coerceLanguage, parseFrontmatter } from './transpiler/metadata'
import { renderBlock, renderSegmentedBody } from './transpiler/renderer'
import {
  injectExtraBlankLineTokens,
  splitSegments,
} from './transpiler/segmenter'
import {
  type MarkdownToTypstOptions,
  STYLE_TO_TEMPLATE,
  type TranspileContext,
  type TypstStyleId,
} from './transpiler/types'
import {
  collectDefinitions,
  collectFootnotes,
  escapeTypstString,
  findLeadingH1,
  isNonEmpty,
  normalizeText,
  renderTypstArray,
} from './transpiler/utils'

export type { MarkdownToTypstOptions, TypstStyleId }

const RESERVED_FRONTMATTER_KEYS = new Set([
  'title',
  'authors',
  'lang',
  'language',
])

export function resolveTypstLanguage(
  frontmatterLang: string | undefined,
  optionLang: string | undefined,
  markdownContent: string
): string {
  const lang = coerceLanguage(frontmatterLang)
  if (lang) return lang

  if (optionLang === 'western') {
    return 'en'
  }
  if (optionLang === 'cjk') {
    if (/[\u3040-\u309f]|[\u30a0-\u30ff]/.test(markdownContent)) {
      return 'ja'
    }
    if (/[\uac00-\ud7a3]/.test(markdownContent)) {
      return 'ko'
    }
    return 'zh'
  }
  return 'zh' // Default CJK fallback
}

export function markdownToTypst(
  markdown: string,
  options: MarkdownToTypstOptions = {}
): string {
  const currentStyle = options.style ?? 'modern-tech'
  const currentSize = options.size ?? 'compact'
  const currentDensity = options.density ?? 'comfortable'
  const isSlidesStyle = currentStyle.startsWith('slides')
  const normalizedMarkdown = injectExtraBlankLineTokens(markdown)

  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(remarkSimpleMark)
    .use(remarkPagebreakToken)
    .use(remarkSupersub)

  const parsedTree = processor.parse(normalizedMarkdown)
  const tree = processor.runSync(parsedTree) as Root
  const definitions = collectDefinitions(tree)
  const footnoteDefinitions = collectFootnotes(tree)
  const frontmatter = parseFrontmatter(tree)
  const rawOverrides = collectRawOverrides(frontmatter.raw)
  const { title: leadingTitle, index: leadingTitleIndex } = findLeadingH1(
    tree,
    definitions
  ) ?? {
    title: null,
    index: null,
  }

  const title = options.title ?? frontmatter.title ?? leadingTitle ?? ''
  const authors = options.authors ?? frontmatter.authors ?? []
  const lang = resolveTypstLanguage(frontmatter.lang, options.lang, markdown)

  const nodesForBody =
    leadingTitleIndex !== null &&
    normalizeText(title) === normalizeText(leadingTitle)
      ? tree.children.filter((_, index) => index !== leadingTitleIndex)
      : tree.children

  const context: TranspileContext = {
    style: currentStyle,
    size: currentSize,
    density: currentDensity,
    definitions,
    footnoteDefinitions,
  }

  const body = isSlidesStyle
    ? renderSegmentedBody(nodesForBody, context)
    : nodesForBody
        .map((node) => renderBlock(node, 0, context))
        .filter(isNonEmpty)
        .join('\n\n')

  const header: string[] = []
  const styleId: TypstStyleId = options.style ?? 'modern-tech'
  const template =
    STYLE_TO_TEMPLATE[styleId] ?? STYLE_TO_TEMPLATE['modern-tech']
  header.push(`#import "${template.path}": ${template.entry}`)
  const font = options.font ?? 'sans'
  const customFont =
    options.font === 'Custom' ? (options.fontFamilyName ?? '') : ''
  const showArgs = [
    title ? `title: "${escapeTypstString(title)}"` : null,
    authors.length
      ? `authors: ${renderTypstArray(authors.map((a) => `"${escapeTypstString(a)}"`))}`
      : null,
    `lang: "${lang}"`,
    ...(customFont
      ? [`customFont: "${escapeTypstString(customFont)}"`]
      : rawOverrides.has('font')
        ? [renderRawArg('font', rawOverrides.get('font')!)]
        : [font !== 'sans' ? `font: "${font}"` : null]),
    ...(rawOverrides.has('size')
      ? [renderRawArg('size', rawOverrides.get('size')!)]
      : [
          options.size && options.size !== 'compact'
            ? `size: "${options.size}"`
            : null,
        ]),
    ...(rawOverrides.has('density')
      ? [renderRawArg('density', rawOverrides.get('density')!)]
      : [
          options.density && options.density !== 'comfortable'
            ? `density: "${options.density}"`
            : null,
        ]),
    ...(rawOverrides.has('theme')
      ? [renderRawArg('theme', rawOverrides.get('theme')!)]
      : [options.theme ? `theme: "${options.theme}"` : null]),
    ...renderExtraRawArgs(
      rawOverrides,
      new Set(['size', 'density', 'font', 'theme'])
    ),
  ]
    .filter(isNonEmpty)
    .join(', ')
  header.push(
    showArgs
      ? `#show: ${template.entry}.with(${showArgs})`
      : `#show: ${template.entry}`
  )
  header.push(
    '#show image: it => if it.width != auto or it.height != auto { it } else { image(it.source, width: 100%, height: 85%, fit: "contain") }'
  )

  return [header.join('\n'), '', body, ''].join('\n')
}

export function markdownToTypstPages(
  markdown: string,
  options: MarkdownToTypstOptions = {}
): string[] {
  const currentStyle = options.style ?? 'modern-tech'
  const currentSize = options.size ?? 'compact'
  const currentDensity = options.density ?? 'comfortable'
  const normalizedMarkdown = injectExtraBlankLineTokens(markdown)

  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(remarkSimpleMark)
    .use(remarkPagebreakToken)
    .use(remarkSupersub)

  const parsedTree = processor.parse(normalizedMarkdown)
  const tree = processor.runSync(parsedTree) as Root
  const definitions = collectDefinitions(tree)
  const footnoteDefinitions = collectFootnotes(tree)
  const frontmatter = parseFrontmatter(tree)
  const rawOverrides = collectRawOverrides(frontmatter.raw)
  const { title: leadingTitle, index: leadingTitleIndex } = findLeadingH1(
    tree,
    definitions
  ) ?? {
    title: null,
    index: null,
  }

  const title = options.title ?? frontmatter.title ?? leadingTitle ?? ''
  const authors = options.authors ?? frontmatter.authors ?? []
  const lang = resolveTypstLanguage(frontmatter.lang, options.lang, markdown)

  const nodesForBody =
    leadingTitleIndex !== null &&
    normalizeText(title) === normalizeText(leadingTitle)
      ? tree.children.filter((_, index) => index !== leadingTitleIndex)
      : tree.children

  const segments = splitSegments(nodesForBody)
  const context: TranspileContext = {
    style: currentStyle,
    size: currentSize,
    density: currentDensity,
    definitions,
    footnoteDefinitions,
  }

  const bodies = segments
    .map((segment) => {
      const rendered = segment.nodes
        .map((node) => renderBlock(node, 0, context))
        .filter(isNonEmpty)
        .join('\n\n')
      if (rendered.trim() !== '') return rendered
      return segment.explicit ? '#v(1pt)' : ''
    })
    .filter((body) => body !== '')

  const styleId: TypstStyleId = options.style ?? 'modern-tech'
  const template =
    STYLE_TO_TEMPLATE[styleId] ?? STYLE_TO_TEMPLATE['modern-tech']
  const font = options.font ?? 'sans'
  const customFont =
    options.font === 'Custom' ? (options.fontFamilyName ?? '') : ''
  const importLine = `#import "${template.path}": ${template.entry}`

  function buildHeader(includeTitle: boolean): string {
    const showArgs = [
      includeTitle && title ? `title: "${escapeTypstString(title)}"` : null,
      includeTitle && authors.length
        ? `authors: ${renderTypstArray(authors.map((a) => `"${escapeTypstString(a)}"`))}`
        : null,
      `lang: "${lang}"`,
      ...(customFont
        ? [`customFont: "${escapeTypstString(customFont)}"`]
        : rawOverrides.has('font')
          ? [renderRawArg('font', rawOverrides.get('font')!)]
          : [font !== 'sans' ? `font: "${font}"` : null]),
      ...(rawOverrides.has('size')
        ? [renderRawArg('size', rawOverrides.get('size')!)]
        : [
            options.size && options.size !== 'compact'
              ? `size: "${options.size}"`
              : null,
          ]),
      ...(rawOverrides.has('density')
        ? [renderRawArg('density', rawOverrides.get('density')!)]
        : [
            options.density && options.density !== 'comfortable'
              ? `density: "${options.density}"`
              : null,
          ]),
      ...(rawOverrides.has('theme')
        ? [renderRawArg('theme', rawOverrides.get('theme')!)]
        : [options.theme ? `theme: "${options.theme}"` : null]),
      ...renderExtraRawArgs(
        rawOverrides,
        new Set(['size', 'density', 'font', 'theme'])
      ),
    ]
      .filter(isNonEmpty)
      .join(', ')
    const showLine = showArgs
      ? `#show: ${template.entry}.with(${showArgs})`
      : `#show: ${template.entry}`
    return [
      importLine,
      showLine,
      '#show image: it => if it.width != auto or it.height != auto { it } else { image(it.source, width: 100%, height: 85%, fit: "contain") }',
    ].join('\n')
  }

  return bodies.map((body, i) =>
    [buildHeader(i === 0), '', body, ''].join('\n')
  )
}

function collectRawOverrides(
  raw: Record<string, string> | undefined
): Map<string, string> {
  if (!raw) return new Map()
  const map = new Map<string, string>()
  for (const [key, value] of Object.entries(raw)) {
    if (RESERVED_FRONTMATTER_KEYS.has(key.toLowerCase())) continue
    map.set(key.toLowerCase(), value)
  }
  return map
}

function renderRawArg(key: string, value: string): string {
  if (looksLikeLength(value) || looksLikeStringLiteral(value)) {
    return `${key}: ${value}`
  }
  return `${key}: "${value.replace(/"/g, '\\"')}"`
}

function looksLikeLength(value: string): boolean {
  return /^-?\d+(?:\.\d+)?(?:pt|mm|cm|in|em|rem|%)$/.test(value)
}

function looksLikeStringLiteral(value: string): boolean {
  return /^(true|false|null|\[.*\]|\{.*\})$/.test(value.trim())
}

function renderExtraRawArgs(
  overrides: Map<string, string>,
  skip: Set<string>
): string[] {
  const out: string[] = []
  for (const [key, value] of overrides.entries()) {
    if (skip.has(key)) continue
    out.push(renderRawArg(key, value))
  }
  return out
}
