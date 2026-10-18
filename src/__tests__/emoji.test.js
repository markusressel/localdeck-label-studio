import { describe, it, expect } from 'vitest'
import { isEmoji } from '../utils/emojiUtils.js'

describe('isEmoji', () => {
  it('matches modern emojis using unicode property escapes', () => {
    expect(isEmoji('▶️')).toBe(true) // Variation selector
    expect(isEmoji('⚙️')).toBe(true)
    expect(isEmoji('🔥')).toBe(true)
    expect(isEmoji('a')).toBe(false)
    expect(isEmoji('mdi:home')).toBe(false)
    expect(isEmoji('')).toBe(false)
  })

  it('accepts shortcodes only with colons', () => {
    expect(isEmoji(':fire:')).toBe(true)
    // Bare words that happen to be shortcode names are icon search terms
    expect(isEmoji('fire')).toBe(false)
    expect(isEmoji('lock')).toBe(false)
  })
})
