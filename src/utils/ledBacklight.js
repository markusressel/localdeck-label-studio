// Shared model of the per-key LED backlight for the 3D preview.

// Duration of one breathing or rainbow cycle; matches the 2D preview animations
export const EFFECT_PERIOD_S = 3

// How much LED light each label material lets through, and how much it evens
// out the light by scattering it (a multiplier on the LED falloff distance).
// The print sits on the surface, so the label itself stays sharp either way.
const LABEL_BACKLIGHT = {
  transparent: { transmittance: 0.9, diffusion: 1 },
  'thin-paper': { transmittance: 0.45, diffusion: 1.6 },
  'thick-paper': { transmittance: 0.18, diffusion: 2.5 }
}

export const labelBacklight = (material) => LABEL_BACKLIGHT[material] ?? LABEL_BACKLIGHT.transparent

/**
 * Shadow of the switch stem on the label, measured from the LED towards the key
 * center (the label spans about -1.5mm to 11.5mm). The LED lights mainly the
 * lower third directly; scattering materials spread light further into the shadow.
 *
 * @param {{ diffusion: number }} backlight - see labelBacklight()
 * @returns {{ startMm: number, endMm: number, indirect: number }}
 */
export const stemShadow = ({ diffusion }) => ({
  startMm: 2.5,
  endMm: 2.5 + 3.5 * Math.sqrt(diffusion),
  indirect: Math.min(0.12 * diffusion, 0.5)
})

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

const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

/**
 * Relative LED light level at a point of the cap or label, the same model the
 * rasterized preview applies in its shader (see addLedFalloff()): it fades
 * with the distance from the LED and drops to an indirect share in the
 * shadow of the switch stem.
 *
 * @param {number} distanceMm - 3D distance from the LED
 * @param {number} alongMm - distance from the LED towards the key center, in the horizontal plane
 * @param {object} options
 * @param {number} options.falloffMm
 * @param {number} [options.nearMm]
 * @param {{ startMm: number, endMm: number, indirect: number }} options.shadow - see stemShadow()
 * @returns {number} 0..1
 */
export function ledGlow(distanceMm, alongMm, { falloffMm, nearMm = 0, shadow }) {
  const falloff = Math.exp(-Math.max(distanceMm - nearMm, 0) / falloffMm)
  const shadowed = smoothstep(shadow.startMm, shadow.endMm, alongMm)
  return falloff * (1 + (shadow.indirect - 1) * shadowed)
}

// Range of the glow lookup texture used by the path tracer
export const GLOW_LOOKUP = { maxDistanceMm: 40, minAlongMm: -15, maxAlongMm: 15 }

/**
 * Texture coordinates of a point in the glow lookup texture: u is the distance
 * from the LED, v the position along the stem shadow.
 *
 * @param {number} distanceMm
 * @param {number} alongMm
 * @returns {[number, number]}
 */
export const glowLookupUv = (distanceMm, alongMm) => [
  Math.min(distanceMm / GLOW_LOOKUP.maxDistanceMm, 1),
  Math.min(Math.max((alongMm - GLOW_LOOKUP.minAlongMm) / (GLOW_LOOKUP.maxAlongMm - GLOW_LOOKUP.minAlongMm), 0), 1)
]
