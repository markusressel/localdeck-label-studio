import * as emoji from 'node-emoji'

export const isEmoji = (str) => {
  if (!str) return false
  return /\p{Extended_Pictographic}/u.test(str) || emoji.has(str)
}

// Replace :shortcode: sequences with their emoji
export const emojify = (str) => emoji.emojify(str)

export const searchEmojis = (query) => emoji.search(query)
