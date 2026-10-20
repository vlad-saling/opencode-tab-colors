export interface Oklch {
  readonly l: number
  readonly c: number
  readonly h: number
}

type Rgb = readonly [number, number, number]

interface MarkColor {
  readonly square: string
  readonly circle: string
  readonly hue: number
  readonly chroma: number
}

// Hues match the emoji, so the title mark and the prompt bar agree. Ordered so consecutive tabs sit far apart.
const MARK_COLORS: readonly MarkColor[] = [
  { square: "🟩", circle: "🟢", hue: 145, chroma: 0.13 },
  { square: "🟦", circle: "🔵", hue: 255, chroma: 0.13 },
  { square: "🟥", circle: "🔴", hue: 27, chroma: 0.13 },
  { square: "🟨", circle: "🟡", hue: 100, chroma: 0.13 },
  { square: "🟪", circle: "🟣", hue: 305, chroma: 0.13 },
  { square: "🟧", circle: "🟠", hue: 55, chroma: 0.13 },
  { square: "🟫", circle: "🟤", hue: 55, chroma: 0.06 },
]

// Squares first, then circles, so the first seven tabs differ by color and the next seven by shape too.
export const MARK_COUNT = MARK_COLORS.length * 2
export const MARKS = [...MARK_COLORS.map((color) => color.square), ...MARK_COLORS.map((color) => color.circle)]

export function markColor(index: number): Oklch {
  const round = Math.floor(index / MARK_COLORS.length) % 2
  const color = MARK_COLORS[index % MARK_COLORS.length]
  return { l: round === 0 ? 0.62 : 0.76, c: color.chroma, h: color.hue }
}

export function oklab({ l, c, h }: Oklch): Rgb {
  const radians = (h * Math.PI) / 180
  return [l, c * Math.cos(radians), c * Math.sin(radians)]
}

function linearRgb(color: Oklch): Rgb {
  const [l, a, b] = oklab(color)
  const lms = [
    (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (l - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ]
  return [
    4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2],
    -1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2],
    -0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2],
  ]
}

function inGamut(rgb: Rgb): boolean {
  return rgb.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4)
}

// Lowers chroma until the color fits sRGB, so lightness and hue stay as chosen.
export function fitGamut(color: Oklch): Oklch {
  if (inGamut(linearRgb(color))) return color
  let low = 0
  let high = color.c
  for (let step = 0; step < 20; step++) {
    const mid = (low + high) / 2
    if (inGamut(linearRgb({ ...color, c: mid }))) low = mid
    else high = mid
  }
  return { ...color, c: low }
}

function clamp(channel: number): number {
  return Math.min(1, Math.max(0, channel))
}

function luminance(color: Oklch): number {
  const [r, g, b] = linearRgb(fitGamut(color)).map(clamp)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(first: number, second: number): number {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

export function hex(color: Oklch): string {
  const encode = (channel: number) => {
    const value = clamp(channel)
    const srgb = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055
    return Math.round(srgb * 255)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${linearRgb(fitGamut(color)).map(encode).join("")}`
}

// Black or white, whichever reads better; one of them always reaches WCAG AA (4.5:1).
export function textColor(background: Oklch): { readonly hex: string; readonly contrast: number } {
  const bg = luminance(background)
  const onBlack = contrast(bg, 0)
  const onWhite = contrast(bg, 1)
  return onBlack >= onWhite ? { hex: "#000000", contrast: onBlack } : { hex: "#ffffff", contrast: onWhite }
}
