import { emojify } from './emojiUtils.js'

export const TEXTURE_SIZE = 256

// The 2D preview renders ~53px per 14mm label; the texture is 256px wide
const PX_SCALE = 4.8
const CENTER = TEXTURE_SIZE / 2

// Canvas colors here are drawn opaque; drop the alpha channel of #rrggbbaa colors
const opaqueColor = (color) => (color.length === 9 ? color.substring(0, 7) : color)

/**
 * Draw a label onto a TEXTURE_SIZE x TEXTURE_SIZE 2D canvas context, emulating
 * the layout of the 2D LabelPreview (icon above text, offsets, flipping).
 *
 * Text and emoji are drawn immediately. Iconify icons and uploaded images load
 * asynchronously and are drawn once ready: then a promise is returned that
 * settles after that, so the caller can mark its texture as updated (a failed
 * load is logged and does not reject). Otherwise null is returned.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} label
 * @param {object} style - the label's resolved style, see resolveLabelStyle()
 * @param {object} options
 * @param {boolean} options.opaque - fill the background (paper materials) instead of clearing it
 * @param {(name: string, color: string) => Promise<CanvasImageSource>} options.loadIcon
 * @param {(src: string) => Promise<CanvasImageSource>} options.loadImage
 * @returns {Promise<void> | null}
 */
export function drawLabelTexture(ctx, label, style, { opaque, loadIcon, loadImage }) {
  if (opaque) {
    const bg = style.backgroundColor || 'transparent'
    ctx.fillStyle = opaqueColor(bg === 'transparent' ? '#ffffff' : bg)
    ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  } else {
    ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)
  }

  const textColor = opaqueColor(style.textColor || '#000000')
  const iconColor = opaqueColor(style.iconColor || '#000000')
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Emulate the flex column layout: icon pushed up, text pushed down when both are present
  const hasBoth = label.text && label.icon
  const iconBaseY = hasBoth ? 96 : CENTER
  const textBaseY = hasBoth ? 186 : CENTER

  if (label.text) {
    ctx.save()
    ctx.translate(CENTER + (label.textOffsetX || 0) * PX_SCALE, textBaseY + (label.textOffsetY || 0) * PX_SCALE)
    ctx.font = `bold ${style.textSize * PX_SCALE}px sans-serif`
    ctx.textBaseline = 'middle'
    ctx.fillStyle = textColor
    ctx.fillText(emojify(label.text), 0, 0)
    ctx.restore()
  }

  const iconSize = style.iconSize * PX_SCALE
  const placeIcon = () => {
    ctx.translate(CENTER + (label.iconOffsetX || 0) * PX_SCALE, iconBaseY + (label.iconOffsetY || 0) * PX_SCALE)
    ctx.scale(label.iconFlipH ? -1 : 1, label.iconFlipV ? -1 : 1)
  }
  const drawImageWhenLoaded = (loading, what) => loading
    .then(image => {
      ctx.save()
      placeIcon()
      ctx.drawImage(image, -iconSize / 2, -iconSize / 2, iconSize, iconSize)
      ctx.restore()
    })
    .catch(err => console.warn(`3D preview: could not load ${what}`, err))

  if (label.icon) {
    const isIconify = label.icon.includes(':') && !label.icon.startsWith(':')
    if (isIconify) {
      if (label.icon.split(':').length === 2) {
        return drawImageWhenLoaded(loadIcon(label.icon, iconColor), `icon ${label.icon}`)
      }
    } else {
      // Emoji
      ctx.save()
      placeIcon()
      ctx.font = `${iconSize}px sans-serif`
      ctx.textBaseline = 'middle'
      ctx.fillStyle = iconColor
      ctx.fillText(emojify(label.icon), 0, 0)
      ctx.restore()
    }
  } else if (label.image) {
    return drawImageWhenLoaded(loadImage(label.image), 'image')
  }
  return null
}
