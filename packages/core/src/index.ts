/**
 * @pdfstart/core - shared markdown -> Typst transpiler for scenario packages.
 *
 * Source-only workspace package (private: true). NOT published on purpose;
 * scenario packages (report, invoice, ...) vendor it at build time.
 */
export {
  markdownToTypst,
  markdownToTypstPages,
  resolveTypstLanguage,
} from "./markdownToTypst.js";
export {
  STYLE_TO_TEMPLATE,
  type MarkdownToTypstOptions,
  type TypstStyleId,
} from "./transpiler/types.js";
