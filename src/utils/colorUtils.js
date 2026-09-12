export const isColorTransparent = (color) => {
  if (!color) return false
  if (color === 'transparent') return true
  if (typeof color === 'string' && color.startsWith('#')) {
    if (color.length === 9 && color.slice(7).toLowerCase() === '00') return true
    if (color.length === 5 && color.slice(4).toLowerCase() === '0') return true
  }
  return false
}
