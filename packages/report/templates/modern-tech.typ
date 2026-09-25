// Style: Modern Tech.
// All-sans (web-like reading), paragraph spacing instead of first-line indent, modern code blocks.

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
  // 1) Page: wide margins for comfortable reading
  set page(
    paper: "a4",
    margin: (x: 1.8cm, y: 2cm),
    numbering: "1",
  )
  set document(title: title, author: authors)

  // 2) Font stack: sans (default, comfortable on screen) or serif (long CJK reading) per the font arg; emoji font appended
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

  // 3) Paragraphs: no first-line indent; paragraph spacing instead (closer to web reading)
  set par(
    justify: true,
    leading: body-leading,
    first-line-indent: 0pt,
    spacing: body-spacing,
  )
  set list(indent: 1em, body-indent: 0.5em, spacing: 0.8em, marker: [•])
  set enum(indent: 1em, body-indent: 0.5em, spacing: 0.8em)

  // 4) Headings: bold, dark gray, whitespace (clear hierarchy)
  show heading: it => {
    set text(
      weight: "bold",
      fill: rgb("#333333"),
      font: heading-fonts,
    )
    block(above: 2em, below: 1em, it)
  }

  // 5) Link color: tech blue
  show link: set text(fill: rgb("#0074de"))

  // 6) Quotes: left accent bar + light background
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

  // 7) Inline code: light background + rounded corners (more than a monospace swap)
  show raw.where(block: false): it => box(
    fill: luma(240),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  // 8) Code blocks: rounded corners + light gray background
  show raw.where(block: true): block.with(
    fill: luma(245),
    inset: 12pt,
    radius: 6pt,
    width: 100%,
    stroke: none,
  )
  show raw: set text(font: ("JetBrains Mono", "Fira Code", "Consolas", "DejaVu Sans Mono"))

  // 9) Tables: subtle borders, gray header row
  set table(
    stroke: (paint: luma(200), thickness: 0.5pt),
    inset: 8pt,
    fill: (x, y) => if y == 0 { rgb("#444444") } else { none },
  )
  show table: set par(justify: false, spacing: 0.6em)
  show table.cell.where(y: 0): set text(weight: "bold", fill: white)

  // Title block (optional)
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
