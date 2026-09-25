// 方案三：极简正式风 (The "Executive Minimal" Style)
// 特点：零装饰白底、衬线正文、克制的字号阶梯、大量留白——
// 文档本身可信，不需要设计来证明。面向管理层与外部读者的高频审美。

#let article(
  title: "",
  authors: (),
  size: "regular",
  density: "relaxed",
  font: "serif",
  customFont: "",
  lang: "zh",
  ..args,
  body
) = {
  let is-cjk = lang in ("zh", "ja", "ko")
  let size-map = (
    cjk: (compact: 10.0pt, regular: 11.0pt, large: 12.0pt),
    latin: (compact: 10.0pt, regular: 11.0pt, large: 12.0pt),
  )
  let density-map = (
    cjk: (
      tight: (leading: 1.15em, spacing: 1.5em),
      comfortable: (leading: 1.35em, spacing: 1.8em),
      relaxed: (leading: 1.55em, spacing: 2.1em),
    ),
    latin: (
      tight: (leading: 0.95em, spacing: 1.1em),
      comfortable: (leading: 1.15em, spacing: 1.35em),
      relaxed: (leading: 1.35em, spacing: 1.6em),
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
  // 1) 页面：A4，宽边距，页码克制（小号居中）
  set page(
    paper: "a4",
    margin: (x: 2.4cm, y: 2.6cm),
    numbering: "1",
  )
  set document(title: title, author: authors)

  // 2) 字体：衬线正文为主；无衬线仅作回退。标题同衬线家族，靠字重与字号建立层级。
  let serif-fonts = (
    "Libertinus Serif",
    "Noto Serif SC",
    "Noto Serif CJK SC",
    "Noto Color Emoji",
  )
  let sans-fonts = (
    "Libertinus Sans",
    "Noto Sans SC",
    "Noto Sans CJK SC",
    "Noto Color Emoji",
  )
  let base-body-fonts = if font == "sans" { sans-fonts } else { serif-fonts }
  let body-fonts = if customFont != "" {
    (customFont,) + base-body-fonts
  } else {
    base-body-fonts
  }
  let heading-fonts = body-fonts
  set text(
    font: body-fonts,
    size: text-size,
    fill: rgb("#1a1a1a"),
    lang: lang,
  )

  // 3) 段落：两端对齐、首行不缩进，层级全部交给留白
  set par(
    justify: true,
    leading: body-leading,
    first-line-indent: 0pt,
    spacing: body-spacing,
  )
  set list(indent: 1em, body-indent: 0.5em, spacing: 0.7em, marker: [–])
  set enum(indent: 1em, body-indent: 0.5em, spacing: 0.7em)

  // 4) 标题：不加粗到黑、不用颜色，仅字重 + 字号 + 上下留白
  show heading: it => {
    set text(
      weight: if it.level == 1 { "semibold" } else { "medium" },
      size: if it.level == 1 { 1.3em } else if it.level == 2 { 1.15em } else { 1.05em },
    )
    block(above: if it.level == 1 { 2.2em } else { 1.8em }, below: 0.8em, it)
  }

  // 5) 链接：无颜色，仅下划线——不抢正文
  show link: it => underline(it)

  // 6) 引用块：无边框无背景，仅缩进与斜体（或首行标记）
  set quote(block: true)
  show quote: it => {
    set par(first-line-indent: 0pt)
    block(
      inset: (left: 1.2em, right: 1.2em, top: 0.2em, bottom: 0.2em),
      width: 100%,
      it.body,
    )
  }

  // 7) 行内代码：仅等宽，无背景色
  show raw.where(block: false): set text(
    font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"),
    size: 0.95em,
  )

  // 8) 代码块：单条顶部分隔线，等宽，无背景
  show raw.where(block: true): it => {
    pad(0.6em, box(width: 100%, line(length: 100%, stroke: 0.5pt + rgb("#999999"))))
    pad(0.8em, block(width: 100%, [
      #set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"), size: 0.9em)
      #set par(leading: 1.2em)
      #it
    ]))
  }
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"))

  // 9) 表格：无背景色，细横线（仅表头下线与行间线）
  set table(
    stroke: (paint: rgb("#888888"), thickness: 0.4pt),
    inset: (x: 4pt, y: 7pt),
    fill: (_, _) => none,
  )
  show table: set par(justify: false, spacing: 0.4em)
  show table.cell.where(y: 0): set text(weight: "medium")

  // 标题区：居中、大字号、下方细线与正文分离
  if title != "" {
    align(center)[
      #text(1.9em, weight: "semibold", title)
      #if authors.len() > 0 [
        #v(0.4em)
        #text(0.95em, fill: rgb("#555555"), authors.join(", "))
      ]
    ]
    v(0.5em)
    line(length: 100%, stroke: 0.5pt + rgb("#333333"))
    v(1.4em)
  }

  body
}
