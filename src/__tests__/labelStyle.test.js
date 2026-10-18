import { describe, it, expect } from 'vitest'
import { resolveLabelStyle } from '../utils/labelStyle.js'

const globals = {
  textSize: 12,
  textColor: '#111111',
  iconSize: 30,
  iconColor: '#222222',
  iconFlatten: false,
  backgroundColor: 'transparent',
  lightColor: '#10b981',
  lightBrightness: 80,
  lightEffect: 'breathing'
}

describe('resolveLabelStyle', () => {
  it('inherits globals for null and undefined overrides', () => {
    const style = resolveLabelStyle({ textSize: null, iconColor: undefined, lightBrightness: null }, globals)
    expect(style.textSize).toBe(12)
    expect(style.textColor).toBe('#111111')
    expect(style.iconSize).toBe(30)
    expect(style.iconColor).toBe('#222222')
    expect(style.lightBrightness).toBe(80)
    expect(style.lightEffect).toBe('breathing')
  })

  it('prefers label overrides, including falsy ones', () => {
    const style = resolveLabelStyle({ textSize: 8, lightBrightness: 0, iconFlatten: false }, { ...globals, iconFlatten: true })
    expect(style.textSize).toBe(8)
    expect(style.lightBrightness).toBe(0)
    expect(style.iconFlatten).toBe(false)
  })

  it('turns light off and static when disabled', () => {
    const style = resolveLabelStyle({ lightEnabled: false, lightBrightness: 50 }, globals)
    expect(style.lightEnabled).toBe(false)
    expect(style.lightBrightness).toBe(0)
    expect(style.lightEffect).toBe('static')
  })

  it('forces flat icons for transparent icon colors', () => {
    expect(resolveLabelStyle({ iconColor: '#00000000' }, globals).iconFlatten).toBe(true)
    expect(resolveLabelStyle({}, { ...globals, iconFlatten: true }).iconFlatten).toBe(true)
    expect(resolveLabelStyle({}, globals).iconFlatten).toBe(false)
  })
})
