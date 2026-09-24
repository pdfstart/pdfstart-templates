/**
 * @pdfstart/report-templates - CLI entry.
 *
 * Usage: pdfstart-report <input>.md [-o out.pdf]
 *                            [--style modern-tech|classic-editorial]
 *                            [--lang zh|en|ja|ko] [--title "My report"]
 *
 * Reads a Markdown file and writes a typeset A4 PDF (page numbers,
 * heading hierarchy, tables, CJK-ready). Compilation uses the local
 * typst binary.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  markdownToTypst,
  STYLE_TO_TEMPLATE,
  type MarkdownToTypstOptions,
  type TypstStyleId,
} from "@pdfstart/core";

const here = dirname(fileURLToPath(import.meta.url));

interface CliArgs {
  input: string;
  output?: string;
  style: TypstStyleId;
  lang?: string;
  title?: string;
}

const STYLES = Object.keys(STYLE_TO_TEMPLATE) as TypstStyleId[];

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { input: "", style: "modern-tech" };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-o" || a === "--output") args.output = argv[++i];
    else if (a === "--style") {
      const s = argv[++i] as TypstStyleId;
      if (!STYLES.includes(s)) {
        throw new Error('Unknown style "' + s + '". Options: ' + STYLES.join(", "));
      }
      args.style = s;
    } else if (a === "--lang") args.lang = argv[++i];
    else if (a === "--title") args.title = argv[++i];
    else if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    } else rest.push(a);
  }
  args.input = rest[0] ?? "";
  if (!args.input) {
    printHelp();
    process.exit(1);
  }
  return args;
}

function printHelp(): void {
  const lines = [
    "pdfstart-report - turn your notes into a polished report PDF",
    "",
    "Usage:",
    "  pdfstart-report <input>.md [-o out.pdf] [--style " + STYLES.join("|") + '] [--lang zh|en] [--title "..."]',
    "",
    "Reads a Markdown file and writes a typeset A4 PDF (page numbers,",
    "headings, tables, CJK-ready). Uses the local typst compiler.",
  ];
  console.log(lines.join("\n"));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[]\\]/g, "\\$&");
}

function resolveStyleFile(style: TypstStyleId): string {
  // dev layout: dist/cli.ts sibling is src/cli.ts -> packages/report-templates -> packages/core/src/styles
  const name = basename(STYLE_TO_TEMPLATE[style].path);
  const candidates = [
    join(here, "..", "..", "core", "src", "styles", name),
    join(here, "..", "src", "styles", name),
  ];
  for (const f of candidates) {
    if (existsSync(f)) return f;
  }
  throw new Error('Style file not found for "' + style + '" (looked in: ' + candidates.join(", ") + ")");
}

export async function convert(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (!existsSync(args.input)) {
    throw new Error("Input file not found: " + args.input);
  }
  const markdown = readFileSync(args.input, "utf8");
  const out = args.output ?? args.input.replace(/\.md$/i, "") + ".pdf";

  const typst = markdownToTypst(markdown, {
    style: args.style,
    lang: args.lang,
    title: args.title,
  } as MarkdownToTypstOptions);

  const styleFile = basename(STYLE_TO_TEMPLATE[args.style].path);
  // Rewrite the transpiler-emitted style import to a file co-located with main.typ
  const importPath = STYLE_TO_TEMPLATE[args.style].path;
  const patched = typst.replace(
    new RegExp('import "' + escapeRegExp(importPath) + '"'),
    'import "' + styleFile + '"'
  );

  const dir = dirname(out);
  mkdirSync(dir, { recursive: true });
  const workDir = join(dir, ".pdfstart-report-" + basename(out));
  mkdirSync(workDir, { recursive: true });
  const mainPath = join(workDir, "main.typ");
  const stylePath = join(workDir, styleFile);
  const outPath = join(workDir, basename(out));

  writeFileSync(mainPath, patched);
  writeFileSync(stylePath, readFileSync(resolveStyleFile(args.style), "utf8"));

  try {
    execFileSync(
      "typst",
      ["compile", mainPath, outPath, "--root", workDir],
      { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }
    );
    if (!existsSync(outPath)) {
      throw new Error("typst compile finished but no PDF was produced");
    }
    if (outPath !== out) {
      writeFileSync(out, readFileSync(outPath));
    }
    const bytes = readFileSync(out).length;
    if (bytes === 0) throw new Error("Produced PDF is empty (0 bytes)");
    console.log("OK  " + out + "  (" + (bytes / 1024).toFixed(1) + " KB, style=" + args.style + ")");
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {}
  }
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === new URL("file://" + process.argv[1]).href;
if (isDirectRun) {
  convert(process.argv.slice(2)).catch((e) => {
    console.error(e && e.message ? e.message : String(e));
    process.exit(1);
  });
}
