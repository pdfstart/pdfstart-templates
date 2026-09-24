# @pdfstart/report

**Turn your notes into a report PDF you can send to your boss as-is.**

You write the words. The report scenario typesets them into a clean,
professional document — page numbers, a proper heading hierarchy, readable
tables, and full Chinese / Japanese / Korean support. No design skills, no
Word, no sign-up.

## Use it in the browser

Go to [PDFStart — Markdown to PDF](https://pdfstart.com/tools/markdown-to-pdf),
paste your notes, pick a style, download the PDF.

That is the supported entry. The browser engine, styles, and fonts are the
same ones this package ships — this repo is where that code lives.

## What you get

- A4, paginated, print-ready PDF
- Consistent heading hierarchy, body text, and tables
- Two ready styles: **Modern tech** and **Classic editorial**
- CJK fonts handled for you — no missing-glyph boxes (zh / ja / ko);
  latin languages (en / de / es / fr / nl) use the engine's built-in fonts

## Embed the engine in your own site

The browser entry is a self-contained ESM bundle. One init, then render as
many times as you like — the typesetting engine loads once and templates are
plain data.

```js
import { initTypst, ensureFonts, render } from "@pdfstart/report/dist/web.js";

const engine = await initTypst({
  wasmUrl:
    "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0/pkg/typst_ts_web_compiler_bg.wasm",
});

await ensureFonts(engine, { langs: ["zh"] }); // latin-only: no-op

const pdf = await render(engine, {
  template: "modern-tech", // or "classic-editorial"
  markdown: "# Weekly Report\n## Shipped\n- ...",
  title: "Weekly Report — Week 37",
  lang: "zh",
}); // Uint8Array — hand it to a download link, a mail attachment, ...
```

`ensureFonts()` fetches Noto CJK on demand for zh / ja / ko (with a CDN
fallback) and registers it into the engine; it is idempotent and cached.

## Example input

```markdown
# Weekly Report — Week 37
## Shipped
- Launched the export flow
## In progress
- Billing reconciliation
## Risks
- API quota on staging
```

## Who this is for

- English — "turn my notes into a polished report"
- Deutsch — "Wochenbericht / Report als PDF aus Markdown"
- Español — "convertir mis notas en un informe PDF"
- Français — "transformer mes notes en un rapport PDF"
- 日本語 — 「週報・レポートを Markdown から PDF に」
- 한국어 — 「주요 업무 보고서 / 주간 보고서를 Markdown에서 PDF로」
- Nederlands — "maken van mijn notities een net PDF-rapport"

## Project

Part of the PDFStart scenario packages (report first; invoice next).

**PDFStart** · [pdfstart.com](https://pdfstart.com/tools/markdown-to-pdf)
