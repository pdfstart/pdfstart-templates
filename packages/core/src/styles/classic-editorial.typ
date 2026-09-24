// 方案二：经典阅读风 (The "Classic Editorial" Style)
// 特点：正文衬线、标题无衬线对比、首行缩进、引用块左侧竖线。

#let article(
  title: "",
  authors: (),
  size: "regular",
  density: "comfortable",
  font: "serif",
  customFont: "",
  lang: "zh",
  ..args,
  body
) = {
  let is-cjk = lang in ("zh", "ja", "ko")
  let size-map = (
    cjk: (compact: 11.0pt, regular: 11.5pt, large: 13.0pt),
    latin: (compact: 11.0pt, regular: 12.0pt, large: 14.0pt),
  )
  let density-map = (
    cjk: (
      tight: (leading: 1.1em, spacing: 0.7em, indent: 2em),
      comfortable: (leading: 1.25em, spacing: 0.9em, indent: 2em),
      relaxed: (leading: 1.45em, spacing: 1.2em, indent: 2em),
    ),
    latin: (
      tight: (leading: 0.9em, spacing: 0.7em, indent: 1.5em),
      comfortable: (leading: 1.1em, spacing: 0.9em, indent: 2em),
      relaxed: (leading: 1.3em, spacing: 1.2em, indent: 2.2em),
    ),
  )
  let resolve-size(v) = if type(v) == str and v in ("compact", "regular", "large") {
    size-map.at(if is-cjk { "cjk" } else { "latin" }).at(v)
  } else { v }
  let resolve-leading(v) = if type(v) == str and v in ("tight", "comfortable", "relaxed") {
    density-map.at(if is-cjk { "cjk" } else { "latin" }).at(v).leading
  } else { v }
  let resolve-spacing(v) = if type(v) == str and v in ("tight", "comfortable", "relaxed") {
    density-map.at(if is-cjk { "cjk" } else { "latin" }).at(v).spacing
  } else { v }
  let resolve-indent(v) = if type(v) == str and v in ("tight", "comfortable", "relaxed") {
    density-map.at(if is-cjk { "cjk" } else { "latin" }).at(v).indent
  } else { v }
  let text-size = resolve-size(size)
  let body-leading = resolve-leading(args.at("leading", default: density))
  let body-spacing = resolve-spacing(args.at("spacing", default: density))
  let body-indent = resolve-indent(args.at("indent", default: density))
  set page(paper: "a4", margin: (x: 2.5cm, y: 2.5cm))
  set document(title: title, author: authors)

  // 1) 字体：正文衬线 + 英文字体兜底（更像纸质阅读），标题单独用无衬线建立对比，末尾添加 emoji 字体
  let base-body-fonts = (
    "Libertinus Serif",
    "Noto Serif SC",
    "Noto Serif CJK SC",
    "Noto Color Emoji",
  )
  let body-fonts = if customFont != "" {
    (customFont,) + base-body-fonts
  } else {
    base-body-fonts
  }
  let base-heading-fonts = ("IBM Plex Sans", "Noto Sans CJK SC", "Noto Color Emoji")
  let heading-fonts = if customFont != "" {
    (customFont,) + base-heading-fonts
  } else {
    base-heading-fonts
  }
  let base-title-fonts = ("Noto Serif CJK SC", "Noto Serif SC", "Libertinus Serif", "Noto Color Emoji")
  let title-fonts = if customFont != "" {
    (customFont,) + base-title-fonts
  } else {
    base-title-fonts
  }
  set text(
    font: body-fonts,
    size: text-size,
    lang: lang,
  )

  // 2) 段落：传统书籍排版（但略增行距/段距，避免过紧）
  set par(
    justify: true,
    leading: body-leading,
    first-line-indent: body-indent,
    spacing: body-spacing,
  )
  set list(indent: 1em, body-indent: 0.5em, spacing: 0.6em, marker: [•])
  set enum(indent: 1em, body-indent: 0.5em, spacing: 0.6em)

  // 3) 标题：无衬线形成对比 + 加粗 + 深灰
  show heading: it => {
    set text(font: heading-fonts, weight: "bold", fill: rgb("#333333"))
    block(above: 2em, below: 1em, it)
  }
  show heading.where(level: 1): it => {
    set align(center)
    set text(size: 1.5em, weight: "bold")
    block(above: 2em, below: 1em, it)
  }

  // 4) 引用块：左侧竖线
  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: luma(248),
      stroke: (left: 2pt + gray),
      inset: (left: 0.9em, right: 0.2em, top: 0.15em, bottom: 0.15em),
      radius: 3pt,
      width: 100%,
      it.body,
    )
  }

  // 5) 行内代码：轻背景 + 圆角
  show raw.where(block: false): it => box(
    fill: luma(240),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  // 6) 代码块：浅灰背景 + 圆角
  show raw.where(block: true): block.with(
    fill: luma(245),
    inset: 10pt,
    radius: 5pt,
    width: 100%,
    stroke: luma(220),
  )
  show raw: set text(font: ("DejaVu Sans Mono",))

  // 7) 表格样式：经典边框
  set table(
    stroke: (paint: luma(150), thickness: 0.8pt),
    inset: 7pt,
    fill: (x, y) => if y == 0 { luma(240) } else { none },
  )
  show table: set par(justify: false, first-line-indent: 0pt, spacing: 0.5em)
  show table.cell.where(y: 0): set text(weight: "bold")

  // 标题区（可选）
  if title != "" {
    align(center)[
      #text(2em, weight: "bold", font: title-fonts, title)
      #if authors.len() > 0 [
        #v(0.35em)
        #text(0.95em, authors.join(", "))
      ]
      #v(0.5em)
      #line(length: 100%, stroke: 0.5pt + gray)
      #v(2em)
    ]
  }

  body
}
