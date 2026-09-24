/**
 * @pdfstart/report - web entry (browser ESM, self-contained).
 *
 * The typst engine loads once; templates are plain data, so render() can be
 * called any number of times without re-initialization.
 *
 * Usage (any static site):
 *   import { initTypst, render, ensureFonts } from "@pdfstart/report/dist/web.js";
 *   const engine = await initTypst({ wasmUrl: "https://cdn.jsdelivr.net/.../typst_ts_web_compiler_bg.wasm" });
 *   await ensureFonts(engine, { langs: ["zh"] }); // latin: no-op
 *   const pdf = await render(engine, { template: "modern-tech", markdown, title, lang: "zh" });
 */
import {
  markdownToTypst,
  fetchRequiredFontBuffers,
  STYLE_TO_TEMPLATE,
  type MarkdownToTypstOptions,
  type TypstStyleId,
  type FontInfo,
  type LangCode,
} from "@pdfstart/core";
import {
  createTypstCompiler,
  createTypstFontBuilder,
  initOptions,
  loadFonts,
  MemoryAccessModel,
  type TypstCompiler,
  type TypstFontBuilder,
} from "@myriaddreamin/typst.ts";

// Inline the typst style templates at build time (same as the CLI entry):
// templates are pure data; only the .typ files that actually exist in core
// are inlined. Unknown template ids must be rejected with a clear error.
declare module "*/modern-tech.typ" { const src: string; export default src; }
declare module "*/classic-editorial.typ" { const src: string; export default src; }
import modernTechRaw from "@pdfstart/core/styles/modern-tech.typ";
import classicEditorialRaw from "@pdfstart/core/styles/classic-editorial.typ";

export const TEMPLATE_IDS = [
  "modern-tech",
  "classic-editorial",
] as const;

type WebTemplateId = (typeof TEMPLATE_IDS)[number];

const STYLE_RAW: Record<string, string> = {
  ["modern-tech"]: modernTechRaw,
  ["classic-editorial"]: classicEditorialRaw,
};

function assertTemplate(template: string): asserts template is WebTemplateId {
  if (!(TEMPLATE_IDS as readonly string[]).includes(template)) {
    throw new Error(
      'Unknown template "' +
        template +
        '". Options: ' +
        TEMPLATE_IDS.join(", ")
    );
  }
}

export interface Engine {
  compiler: TypstCompiler;
  wasmUrl: string;
}

export interface InitOptions {
  wasmUrl: string;
}

export async function initTypst(opts: InitOptions): Promise<Engine> {
  if (!opts || typeof opts.wasmUrl !== "string" || opts.wasmUrl.length === 0) {
    throw new Error("initTypst: opts.wasmUrl is required (a URL to the typst wasm module)");
  }
  const compiler = createTypstCompiler();
  const accessModel = new MemoryAccessModel();
  await compiler.init({
    getModule: () => opts.wasmUrl,
    beforeBuild: [
      loadFonts([], { assets: false }),
      initOptions.withAccessModel(accessModel),
    ],
  });
  return { compiler, wasmUrl: opts.wasmUrl };
}

export interface RenderArgs {
  template: string;
  markdown: string;
  title?: string;
  lang?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Render markdown to PDF bytes using the already-initialized engine.
 * Call any number of times after a single initTypst() (templates are data).
 */
export async function render(engine: Engine, args: RenderArgs): Promise<Uint8Array> {
  assertTemplate(args.template);
  if (typeof args.markdown !== "string" || args.markdown.length === 0) {
    throw new Error("render: args.markdown must be a non-empty string");
  }
  const style: TypstStyleId = args.template as TypstStyleId;
  const opts: MarkdownToTypstOptions = { style, lang: args.lang };
  if (args.title) opts.title = args.title;
  const typst = markdownToTypst(args.markdown, opts);

  // The transpiler emits: #import "<path>": <entry>  (path is repo-relative).
  // Rewrite it to the virtual /<basename> we register below (same pattern the
  // upstream demo uses and verifies).
  const importPath = STYLE_TO_TEMPLATE[style].path;
  const styleFile = importPath.split("/").pop() ?? importPath;
  const main = typst.replace(
    new RegExp("import \"" + escapeRegExp(importPath) + "\""),
    'import "' + styleFile + '"'
  );
  if (main === typst) {
    throw new Error("render: could not locate the style import line in the generated typst source");
  }

  engine.compiler.addSource("/" + styleFile, STYLE_RAW[style]);
  engine.compiler.addSource("/main.typ", main);
  const result = await engine.compiler.compile({
    mainFilePath: "/main.typ",
    format: 1, // pdf
  });
  if (!result.result) {
    const diags = (result.diagnostics ?? [])
      .map((d) => (typeof d === "string" ? d : JSON.stringify(d)))
      .join("\n");
    throw new Error("Compile failed: " + (diags || "no diagnostics"));
  }
  return result.result;
}

export interface EnsureFontsArgs {
  langs?: LangCode[];
  logger?: (msg: string) => void;
}

/**
 * Register fonts required by the given document languages.
 * latin (en/de/es/fr/nl) is a no-op: the engine's built-in fonts cover them.
 * CJK (zh/ja/ko) fetches Noto CJK on demand. Safe to call repeatedly;
 * fonts are cached and registration is idempotent per family.
 */
export async function ensureFonts(
  engine: Engine,
  args: EnsureFontsArgs = {}
): Promise<FontInfo[]> {
  const { info, buffers } = await fetchRequiredFontBuffers(args);
  if (buffers.length === 0) return info; // latin-only document: engine fallback
  const fb = createTypstFontBuilder();
  await fb.init({ getModule: () => engine.wasmUrl });
  for (const data of buffers) {
    await fb.addFontData(data);
  }
  // Bind the resolved font table into the compiler (upstream-verified wiring).
  await fb.build(async (resolver) => {
    engine.compiler.setFonts(resolver);
  });
  return info;
}
