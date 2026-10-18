import * as emoji from 'node-emoji'

export const isEmoji = (str) => {
  if (!str) return false
  if (/\p{Extended_Pictographic}/u.test(str)) return true
  // Shortcodes only count with colons (:fire:); bare words like "lock" are search terms
  return /^:[\w+-]+:$/.test(str) && emoji.has(str)
}

// Replace :shortcode: sequences with their emoji
export const emojify = (str) => emoji.emojify(str)

export const searchEmojis = (query) => emoji.search(query)
