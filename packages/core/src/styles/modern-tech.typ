// 方案一：现代科技风 (The "Modern Tech" Style)
// 特点：全无衬线（更像网页阅读）、段间距、无首行缩进、代码块现代风格。

#let article(
  title: "",
  authors: (),
  size: "compact",
  density: "comfortable",
  font: "sans",
  customFont: "",
  lang: "zh",
  ..args,
  body
) = {
  let is-cjk = lang in ("zh", "ja", "ko")
  let size-map = (
    cjk: (compact: 10.0pt, regular: 11.0pt, large: 12.5pt),
    latin: (compact: 10.5pt, regular: 11.5pt, large: 13.0pt),
  )
  let density-map = (
    cjk: (
      tight: (leading: 1.0em, spacing: 1.1em),
      comfortable: (leading: 1.25em, spacing: 1.35em),
      relaxed: (leading: 1.45em, spacing: 1.7em),
    ),
    latin: (
      tight: (leading: 0.8em, spacing: 0.9em),
      comfortable: (leading: 1.05em, spacing: 1.25em),
      relaxed: (leading: 1.25em, spacing: 1.55em),
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
  let text-size = resolve-size(size)
  let body-leading = resolve-leading(args.at("leading", default: density))
  let body-spacing = resolve-spacing(args.at("spacing", default: density))
  // 1) 页面设置：宽边距，利于阅读
  set page(
    paper: "a4",
    margin: (x: 1.8cm, y: 2cm),
    numbering: "1",
  )
  set document(title: title, author: authors)

  // 2) 字体栈：根据 font 参数选择无衬线（默认，屏幕阅读舒适）或衬线（CJK 长文阅读），末尾添加 emoji 字体
  let sans-fonts = (
    "IBM Plex Sans",
    "Roboto",
    "Libertinus Sans",
    "Noto Sans CJK SC",
    "Noto Sans SC",
    "Noto Serif SC",
    "Noto Color Emoji",
  )
  let serif-fonts = (
    "Libertinus Serif",
    "Noto Serif SC",
    "Noto Serif CJK SC",
    "Noto Color Emoji",
  )
  let base-body-fonts = if font == "serif" { serif-fonts } else { sans-fonts }
  let body-fonts = if customFont != "" {
    (customFont,) + base-body-fonts
  } else {
    base-body-fonts
  }
  let base-heading-fonts = ("IBM Plex Sans", "Roboto", "Noto Sans CJK SC", "Noto Sans SC", "Noto Color Emoji")
  let heading-fonts = if customFont != "" {
    (customFont,) + base-heading-fonts
  } else {
    base-heading-fonts
  }
  set text(
    font: body-fonts,
    size: text-size,
    lang: lang,
  )

  // 3) 段落：放弃首行缩进，采用“段间距”模式（更接近网页阅读）
  set par(
    justify: true,
    leading: body-leading,
    first-line-indent: 0pt,
    spacing: body-spacing,
  )
  set list(indent: 1em, body-indent: 0.5em, spacing: 0.8em, marker: [•])
  set enum(indent: 1em, body-indent: 0.5em, spacing: 0.8em)

  // 4) 标题：加粗、深灰、留白（建立清晰层级）
  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#333333"),
      font: heading-fonts,
    )
    block(above: 2em, below: 1em, it)
  }

  // 5) 链接颜色：科技蓝
  show link: set text(fill: rgb("#0074de"))

  // 6) 引用块：左侧高亮线 + 浅背景
  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      fill: luma(248),
      stroke: (left: 2pt + rgb("#0074de")),
      inset: (left: 0.9em, right: 0.9em, top: 0.7em, bottom: 0.7em),
      radius: 6pt,
      width: 100%,
      it.body,
    )
  }

  // 7) 行内代码：轻背景 + 圆角（避免只是变成等宽字体）
  show raw.where(block: false): it => box(
    fill: luma(240),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  // 8) 代码块：圆角 + 浅灰背景
  show raw.where(block: true): block.with(
    fill: luma(245),
    inset: 12pt,
    radius: 6pt,
    width: 100%,
    stroke: none,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"))

  // 9) 表格样式：交替行背景 + 灰色表头
  set table(
    stroke: (paint: luma(200), thickness: 0.5pt),
    inset: 8pt,
    fill: (x, y) => if y == 0 { rgb("#444444") } else { none },
  )
  show table: set par(justify: false, spacing: 0.6em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: white)

  // 标题区（可选）
  if title != "" {
    align(center)[
      #text(1.8em, weight: "black", title)
      #if authors.len() > 0 [
        #v(0.35em)
        #text(0.95em, fill: rgb("#555555"), authors.join(", "))
      ]
    ]
    v(1em)
  }

  body
}
