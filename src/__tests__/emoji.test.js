import { describe, it, expect } from 'vitest'
import * as emoji from 'node-emoji'

describe('Emoji utility tests', () => {
  it('correctly matches modern emojis using unicode property escapes', () => {
    const isEmoji = (str) => {
      if (!str) return false
      // Fallback for shortcodes just in case
      if (str.startsWith(':') && str.endsWith(':')) return true
      return /\p{Extended_Pictographic}/u.test(str)
    }

    expect(isEmoji('▶️')).toBe(true) // Variation selector
    expect(isEmoji('🔥')).toBe(true)
    expect(isEmoji('a')).toBe(false)
    expect(isEmoji(':play_button:')).toBe(true)
  })
})
