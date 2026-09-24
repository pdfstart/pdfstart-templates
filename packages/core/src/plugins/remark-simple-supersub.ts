import type { PhrasingContent, Text } from 'mdast'
import type { Node, Parent } from 'unist'
import { visit } from 'unist-util-visit'

// Regex to capture ^...^ or ~...~
const REGEX = /(\^.+?\^)|(~.+?~)/g

export default function remarkSimpleSupersub() {
  return (tree: Node) => {
    visit(
      tree,
      'text',
      (node: Text, index: number | undefined, parent: Parent | undefined) => {
        if (index === undefined || parent === undefined) return

        const value = node.value
        if (!value.includes('^') && !value.includes('~')) return

        const parts = value.split(REGEX)
        if (parts.length === 1) return

        const newChildren: PhrasingContent[] = []

        for (const part of parts) {
          if (!part) continue

          if (part.startsWith('^') && part.endsWith('^') && part.length > 2) {
            newChildren.push({
              type: 'superscript',
              children: [{ type: 'text', value: part.slice(1, -1) }],
            } as any)
          } else if (
            part.startsWith('~') &&
            part.endsWith('~') &&
            part.length > 2
          ) {
            newChildren.push({
              type: 'subscript',
              children: [{ type: 'text', value: part.slice(1, -1) }],
            } as any)
          } else {
            if (part !== '') {
              newChildren.push({ type: 'text', value: part })
            }
          }
        }

        parent.children.splice(index, 1, ...newChildren)
        return index + newChildren.length
      }
    )
  }
}
