import { markdownToTypst, STYLE_TO_TEMPLATE } from "../../core/src/index.ts";
import {
  createTypstCompiler,
  initOptions,
  loadFonts,
  MemoryAccessModel,
  type TypstCompiler,
} from "@myriaddreamin/typst.ts";
import typstCompilerWasm from "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url";

const RAW_STYLES = import.meta.glob("../src/styles/*.typ", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function styleRaw(style: string): string {
  const entry = Object.entries(RAW_STYLES).find((p) =>
    p[0].endsWith(style + ".typ")
  );
  if (!entry) throw new Error("style not found: " + style);
  return entry[1];
}

function basename(p: string): string {
  return p.split("/").pop() ?? p;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[]\\]/g, "\\$&");
}

const sample = await (async () => {
  const res = await fetch("/weekly-report.example.md");
  return res.ok ? await res.text() : "# My report\n\nHello from pdfstart.";
})();

const md = document.querySelector<HTMLTextAreaElement>("#md")!;
const styleSel = document.querySelector<HTMLSelectElement>("#style")!;
const langSel = document.querySelector<HTMLSelectElement>("#lang")!;
const go = document.querySelector<HTMLButtonElement>("#go")!;
const dl = document.querySelector<HTMLButtonElement>("#dl")!;
const status = document.querySelector("#status")!;
const frame = document.querySelector<HTMLIFrameElement>("#frame")!;

md.value = sample;

let compiler: TypstCompiler | null = null;
let lastPdf: Uint8Array | null = null;

async function getCompiler(): Promise<TypstCompiler> {
  if (!compiler) {
    status.textContent = "Warming up the PDF engine (first run takes a few seconds)...";
    compiler = createTypstCompiler();
    const accessModel = new MemoryAccessModel();
    await compiler.init({
      getModule: () => typstCompilerWasm,
      beforeBuild: [
        loadFonts([], { assets: false }),
        initOptions.withAccessModel(accessModel),
      ],
    });
  }
  return compiler;
}

async function makePdf(): Promise<void> {
  const style = styleSel.value;
  go.disabled = true;
  dl.disabled = true;
  status.textContent = "Typesetting...";
  try {
    const typst = markdownToTypst(md.value, {
      style: style as never,
      lang: langSel.value,
    });
    const importPath = (STYLE_TO_TEMPLATE as Record<string, { path: string }>)[
      style
    ].path;
    const styleFile = basename(importPath);
    const main = typst.replace(
      new RegExp('import "' + escapeRegExp(importPath) + '"'),
      'import "' + styleFile + '"'
    );
    const c = await getCompiler();
    c.addSource("/main.typ", main);
    c.addSource("/" + styleFile, styleRaw(style));
    const result = await c.compile({
      mainFilePath: "/main.typ",
      format: 1,
    });
    if (!result.result) {
      throw new Error(
        "Compile failed: " + (result.diagnostics ?? []).map(String).join("\n")
      );
    }
    lastPdf = result.result;
    const url = URL.createObjectURL(
      new Blob([result.result as unknown as ArrayBuffer], {
        type: "application/pdf",
      })
    );
    frame.src = url;
    status.textContent = "Done - " + (result.result.length / 1024).toFixed(1) + " KB";
    dl.disabled = false;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    status.textContent = "Error: " + msg;
  } finally {
    go.disabled = false;
  }
}

function download(): void {
  if (!lastPdf) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([lastPdf as unknown as ArrayBuffer], {
      type: "application/pdf",
    })
  );
  a.download = "report.pdf";
  a.click();
}

go.addEventListener("click", () => void makePdf());
dl.addEventListener("click", download);

void makePdf();
