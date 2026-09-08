import * as emoji from 'node-emoji'

export const isEmoji = (str) => {
  if (!str) return false
  return /\p{Extended_Pictographic}/u.test(str) || emoji.has(str)
}
