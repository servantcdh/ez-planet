// ─── Color Conversion Utilities ───

const roundMul = (a: number, b: number, decimals = 0): number => {
  const factor = 10 ** decimals
  return Math.round(a * b * factor) / factor
}

export const toRgba = (hex: string, opacity: number): string => {
  hex = hex.includes('#') ? hex.substring(1) : hex

  const int = parseInt(hex, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  const a = opacity

  return `rgba(${r},${g},${b},${a})`
}

export const toRgbaArray = (rgba: string): number[] => {
  const sliced = rgba.substring(5)
  const values = sliced.substring(0, sliced.length - 1)
  return values.split(',').map((value) => +value)
}

const toHexPair = (value: number) =>
  Math.round(value).toString(16).padStart(2, '0')

const fromHexString = (
  hexColor: string,
): { r: number; g: number; b: number; a: number } | null => {
  let hex = hexColor.startsWith('#') ? hexColor.substring(1) : hexColor
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map((ch) => ch + ch)
      .join('')
  }
  const hasAlpha = hex.length === 8
  if (hex.length !== 6 && !hasAlpha) {
    return null
  }
  const int = parseInt(hex.substring(0, 6), 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  const a = hasAlpha ? parseInt(hex.substring(6), 16) / 255 : 1
  return { r, g, b, a }
}

export const toHex = (color: string): { hex: string; alpha: string } => {
  const fallback = { hex: '000000', alpha: '100%' }
  if (!color) {
    return fallback
  }
  const trimmed = color.trim()

  if (trimmed.startsWith('rgba(')) {
    const [r, g, b, a] = toRgbaArray(trimmed)
    return {
      hex: `${toHexPair(r)}${toHexPair(g)}${toHexPair(b)}`,
      alpha: `${roundMul(a, 100, 0)}%`,
    }
  }

  if (trimmed.startsWith('rgb(')) {
    const values = trimmed
      .substring(4, trimmed.length - 1)
      .split(',')
      .map((value) => +value)
    const [r = 0, g = 0, b = 0] = values
    return {
      hex: `${toHexPair(r)}${toHexPair(g)}${toHexPair(b)}`,
      alpha: '100%',
    }
  }

  const hexColor = fromHexString(trimmed)
  if (hexColor) {
    const { r, g, b, a } = hexColor
    return {
      hex: `${toHexPair(r)}${toHexPair(g)}${toHexPair(b)}`,
      alpha: `${roundMul(a, 100, 0)}%`,
    }
  }

  return fallback
}

export const toRGBAHex = (rgba: string): string => {
  const [r, g, b, a] = toRgbaArray(rgba)
  const red = Math.round(r).toString(16).padStart(2, '0')
  const green = Math.round(g).toString(16).padStart(2, '0')
  const blue = Math.round(b).toString(16).padStart(2, '0')
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${red}${green}${blue}${alpha}`
}
