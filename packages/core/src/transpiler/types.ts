import type {
  Definition,
  FootnoteDefinition,
  Literal,
  PhrasingContent,
  PhrasingContentMap,
  RootContent,
  RootContentMap,
} from 'mdast'

export type MathNode = RootContentMap['math']
export type InlineMathNode = PhrasingContentMap['inlineMath']

export interface Mark extends Literal {
  type: 'mark'
  children: PhrasingContent[]
}

export interface SuperScript extends Literal {
  type: 'superscript'
  children: PhrasingContent[]
}

export interface SubScript extends Literal {
  type: 'subscript'
  children: PhrasingContent[]
}

export interface PageBreakNode extends Literal {
  type: 'pageBreak'
}

declare module 'mdast' {
  interface RootContentMap {
    pageBreak: PageBreakNode
  }
  interface PhrasingContentMap {
    mark: Mark
    superscript: SuperScript
    subscript: SubScript
  }
}

export type RenderableNode = RootContent

export type TypstStyleId =
  | 'modern-tech'
  | 'classic-editorial'
  | 'slides-modern'
  | 'slides-dark'
  | 'slides-minimal'

export type MarkdownToTypstOptions = {
  title?: string
  authors?: string[]
  style?: TypstStyleId
  lang?: string
  font?: string
  fontFamilyName?: string
  fontData?: ArrayBuffer
  size?: 'compact' | 'regular' | 'large'
  density?: 'tight' | 'comfortable' | 'relaxed'
  theme?: string
}

export const STYLE_TO_TEMPLATE: Record<
  TypstStyleId,
  { path: string; entry: string }
> = {
  'modern-tech': { path: 'styles/modern-tech.typ', entry: 'article' },
  'classic-editorial': {
    path: 'styles/classic-editorial.typ',
    entry: 'article',
  },
  'slides-modern': { path: 'styles/slides-modern.typ', entry: 'article' },
  'slides-dark': { path: 'styles/slides-dark.typ', entry: 'article' },
  'slides-minimal': { path: 'styles/slides-minimal.typ', entry: 'article' },
}

export interface TranspileContext {
  style: TypstStyleId
  size: 'compact' | 'regular' | 'large'
  density: 'tight' | 'comfortable' | 'relaxed'
  definitions: Map<string, Definition>
  footnoteDefinitions: Map<string, FootnoteDefinition>
}
