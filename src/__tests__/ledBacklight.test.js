import { describe, it, expect } from 'vitest'
import { ledStateAt, isAnimatedEffect, labelBacklight, EFFECT_PERIOD_S } from '../utils/ledBacklight.js'

const style = (overrides = {}) => ({
  lightEnabled: true,
  lightColor: '#ff8000',
  lightBrightness: 50,
  lightEffect: 'static',
  ...overrides
})

describe('ledStateAt', () => {
  it('is off when the light is disabled', () => {
    expect(ledStateAt(style({ lightEnabled: false }), 0).intensity).toBe(0)
  })

  it('uses the static color and brightness', () => {
    expect(ledStateAt(style(), 1.234)).toEqual({ r: 1, g: 128 / 255, b: 0, intensity: 0.5 })
  })

  it('ignores the alpha channel of the color', () => {
    expect(ledStateAt(style({ lightColor: '#00ff0080' }), 0)).toMatchObject({ r: 0, g: 1, b: 0 })
  })

  it('breathes between 20% and 100% of the brightness', () => {
    const s = style({ lightEffect: 'breathing', lightBrightness: 100 })
    expect(ledStateAt(s, 0).intensity).toBeCloseTo(0.2)
    expect(ledStateAt(s, EFFECT_PERIOD_S / 2).intensity).toBeCloseTo(1)
    expect(ledStateAt(s, EFFECT_PERIOD_S).intensity).toBeCloseTo(0.2)
  })

  it('cycles the rainbow hue starting at red', () => {
    const s = style({ lightEffect: 'rainbow' })
    expect(ledStateAt(s, 0)).toMatchObject({ r: 1, g: 0, b: 0 })
    expect(ledStateAt(s, EFFECT_PERIOD_S / 3)).toMatchObject({ r: 0, g: 1, b: 0 })
    expect(ledStateAt(s, (2 * EFFECT_PERIOD_S) / 3)).toMatchObject({ r: 0, g: 0, b: 1 })
  })
})

describe('isAnimatedEffect', () => {
  it('is true only for enabled breathing or rainbow lights', () => {
    expect(isAnimatedEffect(style({ lightEffect: 'breathing' }))).toBe(true)
    expect(isAnimatedEffect(style({ lightEffect: 'rainbow' }))).toBe(true)
    expect(isAnimatedEffect(style())).toBe(false)
    expect(isAnimatedEffect(style({ lightEffect: 'rainbow', lightEnabled: false }))).toBe(false)
  })
})

describe('labelBacklight', () => {
  it('lets less light through and diffuses more for thicker materials', () => {
    const film = labelBacklight('transparent')
    const thin = labelBacklight('thin-paper')
    const thick = labelBacklight('thick-paper')
    expect(film.transmittance).toBeGreaterThan(thin.transmittance)
    expect(thin.transmittance).toBeGreaterThan(thick.transmittance)
    expect(film.diffusion).toBe(1)
    expect(thin.diffusion).toBeGreaterThan(film.diffusion)
    expect(thick.diffusion).toBeGreaterThan(thin.diffusion)
  })

  it('falls back to film for unknown materials', () => {
    expect(labelBacklight('unknown')).toEqual(labelBacklight('transparent'))
  })
})
