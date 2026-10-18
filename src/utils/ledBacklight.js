// Shared model of the per-key LED backlight for the 3D preview.

// Duration of one breathing or rainbow cycle; matches the 2D preview animations
export const EFFECT_PERIOD_S = 3

// How much LED light each label material lets through, and how far the
// light scatters inside it (in label texture pixels, 256px = one label)
const LABEL_BACKLIGHT = {
  transparent: { transmittance: 0.9, scatterPx: 0 },
  'thin-paper': { transmittance: 0.45, scatterPx: 6 },
  'thick-paper': { transmittance: 0.18, scatterPx: 14 }
}

export const labelBacklight = (material) => LABEL_BACKLIGHT[material] ?? LABEL_BACKLIGHT.transparent

const hexToRgb = (hex) => {
  const value = parseInt((hex || '#000000').slice(1, 7), 16)
  return { r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 }
}

// Hue in [0, 1), full saturation, lightness 0.5
const hueToRgb = (hue) => {
  const channel = (offset) => {
    const k = (offset + hue * 12) % 12
    return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return { r: channel(0), g: channel(8), b: channel(4) }
}

export const isAnimatedEffect = (style) =>
  style.lightEnabled && (style.lightEffect === 'breathing' || style.lightEffect === 'rainbow')

/**
 * LED color and relative intensity at a point in time.
 *
 * @param {object} style - resolved label style, see resolveLabelStyle()
 * @param {number} timeS - seconds since any fixed origin
 * @returns {{ r: number, g: number, b: number, intensity: number }} color channels and intensity in [0, 1]
 */
export function ledStateAt(style, timeS) {
  if (!style.lightEnabled) return { r: 0, g: 0, b: 0, intensity: 0 }
  const brightness = style.lightBrightness / 100
  const phase = (timeS % EFFECT_PERIOD_S) / EFFECT_PERIOD_S

  if (style.lightEffect === 'breathing') {
    // From 20% up to full brightness and back, eased like the 2D preview
    const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase)
    return { ...hexToRgb(style.lightColor), intensity: brightness * (0.2 + 0.8 * wave) }
  }
  if (style.lightEffect === 'rainbow') {
    return { ...hueToRgb(phase), intensity: brightness }
  }
  return { ...hexToRgb(style.lightColor), intensity: brightness }
}
