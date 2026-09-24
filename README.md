# PDFStart

**Turn what you write into a PDF you can send as-is.**

You write the words. PDFStart typesets them into a document that looks like a
publisher shipped it — page numbers, clean headings, tables, CJK-ready. No
design skills, no Word, no sign-up.

**Use it in the browser** at [pdfstart.com — Markdown to PDF](https://pdfstart.com/tools/markdown-to-pdf):
paste your notes, pick a style, download the PDF. Nothing to install.

## Start here

| I want to... | Where |
| --- | --- |
| Make my notes a report I can send to my boss | [Markdown to PDF on pdfstart.com](https://pdfstart.com/tools/markdown-to-pdf) |

## What is in this repo

A small monorepo of scenario packages (report first; invoice next):

- packages/report — @pdfstart/report, the report scenario
- packages/core — shared typesetting engine (internal, not published)

## Development

Package manager: pnpm (no npm lockfiles).

Install with pnpm install, then build the report package, produce a sample PDF
from templates/weekly-report.example.md, or run the local browser demo at
http://localhost:5173.

## Release flow

Versioning uses changesets. Publishing to npm is gated: only the owner's
pdfstart account may publish.

---

**PDFStart** · [pdfstart.com](https://pdfstart.com)
