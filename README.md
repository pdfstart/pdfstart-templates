# pdfstart

**Turn what you write into a PDF you can send as-is.**

You write the words. pdfstart typesets them into a document that looks like a
publisher shipped it - page numbers, clean headings, tables, CJK-ready. No
design skills, no Word, no sign-up.

## Start here

| I want to... | Package | One-liner |
| --- | --- | --- |
| Make my notes a report I can send to my boss | `@pdfstart/report` | `npx @pdfstart/report your-notes.md` |

Every package also has a browser entry - paste, get the PDF, download. No
installation needed for that.

## What is in this repo

A small monorepo of scenario packages (report first; invoice next):

- `packages/report` - `@pdfstart/report`, the report scenario
- `packages/core` - shared typesetting engine (internal, not published)

## Development

Package manager: **pnpm** (no npm lockfiles).

```bash
pnpm install
pnpm run build        # bundle @pdfstart/report CLI
pnpm run report -- templates/weekly-report.example.md   # produce a sample PDF
pnpm run demo         # browser entry (http://localhost:5173)
```

## Release flow

Versioning uses [changesets](https://changesets.com). Publishing to npm is
gated: only the owner's `@pdfstart` account may publish.
