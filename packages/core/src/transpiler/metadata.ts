import type { Root, Yaml } from 'mdast'

export type Frontmatter = {
  title?: string
  authors?: string[]
  lang?: string
  raw?: Record<string, string>
}

export function parseFrontmatter(root: Root): Frontmatter {
  const yamlNode = root.children.find((node) => node.type === 'yaml') as
    | Yaml
    | undefined
  if (!yamlNode?.value) return {}
  return parseFrontmatterYaml(yamlNode.value)
}

const RESERVED_KEYS = new Set([
  'title',
  'authors',
  'author',
  'lang',
  'language',
])

function parseFrontmatterYaml(yaml: string): Frontmatter {
  const lines = yaml.split(/\r?\n/)
  const result: Frontmatter = {}
  const raw: Record<string, string> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim() || line.trim().startsWith('#')) continue

    const langMatch = /^\s*lang(?:uage)?\s*:\s*(.+?)\s*$/.exec(line)
    if (langMatch && !result.lang) {
      result.lang = stripYamlScalar(langMatch[1])
      continue
    }

    const titleMatch = /^\s*title\s*:\s*(.+?)\s*$/.exec(line)
    if (titleMatch && !result.title) {
      result.title = stripYamlScalar(titleMatch[1])
      continue
    }

    const authorMatch = /^\s*author\s*:\s*(.+?)\s*$/.exec(line)
    if (authorMatch && !result.authors) {
      result.authors = [stripYamlScalar(authorMatch[1])].filter(Boolean)
      continue
    }

    const authorsMatch = /^\s*authors\s*:\s*(.*?)\s*$/.exec(line)
    if (authorsMatch && !result.authors) {
      const rest = authorsMatch[1].trim()
      if (rest) {
        result.authors = parseInlineYamlList(rest)
        continue
      }

      const list: string[] = []
      for (let j = i + 1; j < lines.length; j++) {
        const itemMatch = /^\s*-\s*(.+?)\s*$/.exec(lines[j])
        if (!itemMatch) break
        list.push(stripYamlScalar(itemMatch[1]))
        i = j
      }
      result.authors = list.filter(Boolean)
      continue
    }

    const genericMatch = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*?)\s*$/.exec(line)
    if (genericMatch) {
      const key = genericMatch[1].toLowerCase()
      if (RESERVED_KEYS.has(key)) continue
      const value = genericMatch[2].trim()
      if (value === '') {
        let j = i + 1
        const blockLines: string[] = []
        while (j < lines.length && /^\s+/.test(lines[j])) {
          blockLines.push(lines[j])
          j++
        }
        raw[genericMatch[1]] = blockLines.join('\n').trim()
        i = j - 1
      } else {
        raw[genericMatch[1]] = stripYamlScalar(value)
      }
    }
  }

  result.raw = raw
  return result
}

function parseInlineYamlList(value: string): string[] {
  const v = value.trim()
  if (!v) return []
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1)
    return inner
      .split(',')
      .map((s) => stripYamlScalar(s))
      .filter(Boolean)
  }
  return [stripYamlScalar(v)].filter(Boolean)
}

function stripYamlScalar(value: string): string {
  let v = value.trim()
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1)
  }
  return v.trim()
}

export function coerceLanguage(value: string | undefined): string | undefined {
  const v = (value ?? '').trim().toLowerCase()
  const match = /^[a-z]{2}/.exec(v)
  return match ? match[0] : undefined
}
