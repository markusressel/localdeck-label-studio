import { loadIcon, buildIcon } from '@iconify/vue'

const cache = new Map()

/**
 * Load an Iconify icon (e.g. "mdi:home") as an <img> for drawing onto a canvas.
 *
 * Uses the same icon data and cache as the <Icon> component, and renders it from a
 * data URL, so the canvas is never tainted by a cross-origin image.
 *
 * @param {string} name
 * @param {string} color - any CSS color, used for currentColor
 * @returns {Promise<HTMLImageElement>}
 */
export function loadIconImage(name, color) {
  const key = `${name}|${color}`
  if (!cache.has(key)) {
    const promise = loadIcon(name)
      .then(data => {
        // Rasterize at a large size; callers scale it down with drawImage
        const { attributes, body } = buildIcon(data, { height: '256' })
        const attrs = Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(' ')
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" ${attrs} color="${color}">${body}</svg>`
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
        })
      })
      .catch(err => {
        cache.delete(key) // allow a retry on the next render
        throw err
      })
    cache.set(key, promise)
  }
  return cache.get(key)
}
