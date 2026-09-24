/**
 * @pdfstart/core - runtime font loading (browser only).
 *
 * Font policy (fonts are a runtime asset, never shipped in the package,
 * never referenced by name from templates):
 * - latin languages (en/de/es/fr/nl) rely on the typst engine's built-in
 *   fallback fonts -> nothing is fetched;
 * - CJK languages (zh/ja/ko) fetch Noto CJK (Regular + Bold) on demand,
 *   with a jsdelivr fallback when the primary CDN fails.
 *
 * This module is self-contained: no upstream imports, injectable logger.
 */

export type LangCode = "en" | "de" | "es" | "fr" | "ja" | "ko" | "nl" | "zh";

export interface FontInfo {
  key: string;
  family: string;
  bytes: number;
}

interface FontDef {
  key: string;
  family: string;
  cdns: string[];
}

const CJK_FONTS: Record<"zh" | "ja" | "ko", FontDef[]> = {
  zh: [
    {
      key: "noto-sans-sc-regular",
      family: "Noto Sans CJK SC",
      cdns: [
        "https://fonts.gstatic.com/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYw.ttf",
        "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf",
      ],
    },
    {
      key: "noto-sans-sc-bold",
      family: "Noto Sans CJK SC",
      cdns: [
        "https://fonts.gstatic.com/s/notosanssc/v40/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaGzjCnYw.ttf",
        "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf",
      ],
    },
  ],
  ja: [
    {
      key: "noto-sans-jp-regular",
      family: "Noto Sans CJK JP",
      cdns: [
        "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf",
      ],
    },
    {
      key: "noto-sans-jp-bold",
      family: "Noto Sans CJK JP",
      cdns: [
        "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/OTF/Japanese/NotoSansCJKjp-Bold.otf",
      ],
    },
  ],
  ko: [
    {
      key: "noto-sans-kr-regular",
      family: "Noto Sans CJK KR",
      cdns: [
        "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/OTF/Korean/NotoSansCJKkr-Regular.otf",
      ],
    },
    {
      key: "noto-sans-kr-bold",
      family: "Noto Sans CJK KR",
      cdns: [
        "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/OTF/Korean/NotoSansCJKkr-Bold.otf",
      ],
    },
  ],
};

const MIN_FONT_BYTES = 5000; // reject cached error pages

/** Pure, testable: sfnt magic-number check (ttf / otf-cff). */
export function isValidFont(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  const b = data;
  // ttf: 00 01 00 00 ; otf (CFF): "OTTO" = 4F 54 54 4F
  if (b[0] === 0x00 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return true;
  if (b[0] === 0x4f && b[1] === 0x54 && b[2] === 0x54 && b[3] === 0x4f) return true;
  return false;
}

async function fetchWithFallback(
  cdns: string[],
  logger?: (msg: string) => void
): Promise<Uint8Array> {
  let lastErr: string = "no sources";
  for (const url of cdns) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = url + " -> HTTP " + res.status;
        continue;
      }
      const data = new Uint8Array(await res.arrayBuffer());
      if (data.length < MIN_FONT_BYTES || !isValidFont(data)) {
        lastErr = url + " -> invalid font data (" + data.length + " bytes)";
        continue;
      }
      return data;
    } catch (e) {
      lastErr = url + " -> " + (e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error("Failed to load font: " + lastErr);
}

// Session-level cache: repeated calls never re-download.
const bufferCache = new Map<string, Uint8Array>();

export interface FontBuffers {
  info: FontInfo[];
  buffers: Uint8Array[];
}

export interface FetchFontsOptions {
  langs?: LangCode[];
  logger?: (msg: string) => void;
}

/**
 * Fetch the font buffers required for the given document languages.
 * latin langs are a no-op (engine fallback); CJK langs fetch Regular+Bold.
 * Returns empty info+buffers for pure-latin documents (zero network).
 */
export async function fetchRequiredFontBuffers(
  opts: FetchFontsOptions = {}
): Promise<FontBuffers> {
  const log = opts.logger ?? (() => {});
  const langs = opts.langs ?? [];
  const info: FontInfo[] = [];
  const buffers: Uint8Array[] = [];
  const seen = new Set<string>();
  for (const lang of langs) {
    const defs = CJK_FONTS[lang];
    if (!defs) continue; // latin -> engine fallback, nothing to fetch
    for (const def of defs) {
      if (seen.has(def.key)) continue;
      seen.add(def.key);
      let data = bufferCache.get(def.key);
      if (!data) {
        log("fetching font " + def.key);
        data = await fetchWithFallback(def.cdns, log);
        bufferCache.set(def.key, data);
      }
      info.push({ key: def.key, family: def.family, bytes: data.length });
      buffers.push(data);
    }
  }
  return { info, buffers };
}
