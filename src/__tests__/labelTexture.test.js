import { describe, it, expect, vi } from 'vitest'
import { drawLabelTexture, TEXTURE_SIZE } from '../utils/labelTexture.js'
import { resolveLabelStyle } from '../utils/labelStyle.js'

const globals = {
  textSize: 10,
  textColor: '#000000',
  iconSize: 20,
  iconColor: '#000000',
  iconFlatten: false,
  backgroundColor: 'transparent',
  lightColor: '#10b981',
  lightBrightness: 80,
  lightEffect: 'static'
}

// Records every drawing call together with the fill style and font active at that time
const createFakeContext = () => {
  const calls = []
  const ctx = { fillStyle: '', font: '', textAlign: '', textBaseline: '' }
  for (const name of ['fillRect', 'clearRect', 'fillText', 'drawImage', 'save', 'restore', 'translate', 'scale']) {
    ctx[name] = (...args) => calls.push({ name, args, fillStyle: ctx.fillStyle, font: ctx.font })
  }
  ctx.calls = (name) => calls.filter(c => c.name === name)
  return ctx
}

const draw = (label, { opaque = false, loadIcon, loadImage } = {}) => {
  const ctx = createFakeContext()
  const result = drawLabelTexture(ctx, label, resolveLabelStyle(label, globals), {
    opaque,
    loadIcon: loadIcon ?? vi.fn(() => Promise.resolve('icon-image')),
    loadImage: loadImage ?? vi.fn(() => Promise.resolve('upload-image'))
  })
  return { ctx, result }
}

describe('drawLabelTexture', () => {
  it('clears the background for transparent film', () => {
    const { ctx } = draw({ text: 'A' })
    expect(ctx.calls('clearRect')[0].args).toEqual([0, 0, TEXTURE_SIZE, TEXTURE_SIZE])
    expect(ctx.calls('fillRect')).toHaveLength(0)
  })

  it('fills paper backgrounds, white when transparent and without alpha', () => {
    expect(draw({}, { opaque: true }).ctx.calls('fillRect')[0].fillStyle).toBe('#ffffff')
    expect(draw({ backgroundColor: '#11223380' }, { opaque: true }).ctx.calls('fillRect')[0].fillStyle).toBe('#112233')
  })

  it('draws centered text at the resolved size and color', () => {
    const { ctx, result } = draw({ text: 'Hi', textSize: 12, textColor: '#ff0000' })
    const [text] = ctx.calls('fillText')
    expect(text.args).toEqual(['Hi', 0, 0])
    expect(text.fillStyle).toBe('#ff0000')
    expect(text.font).toBe(`bold ${12 * 4.8}px sans-serif`)
    expect(ctx.calls('translate')[0].args).toEqual([128, 128])
    expect(result).toBeNull()
  })

  it('stacks the icon above the text and applies offsets', () => {
    const { ctx } = draw({ text: 'Hi', icon: '🔥', textOffsetX: 1, iconOffsetY: -2 })
    const [textPos, iconPos] = ctx.calls('translate').map(c => c.args)
    expect(textPos).toEqual([128 + 4.8, 186])
    expect(iconPos).toEqual([128, 96 - 2 * 4.8])
  })

  it('draws emoji icons in the icon color and flips them', () => {
    const { ctx } = draw({ icon: '🔥', iconColor: '#00ff00', iconFlipH: true })
    const [icon] = ctx.calls('fillText')
    expect(icon.args[0]).toBe('🔥')
    expect(icon.fillStyle).toBe('#00ff00')
    expect(icon.font).toBe(`${20 * 4.8}px sans-serif`)
    expect(ctx.calls('scale')[0].args).toEqual([-1, 1])
  })

  it('loads Iconify icons in the icon color and draws them when ready', async () => {
    const loadIcon = vi.fn(() => Promise.resolve('icon-image'))
    const { ctx, result } = draw({ icon: 'mdi:home', iconColor: '#0000ff', iconSize: 10 }, { loadIcon })
    expect(loadIcon).toHaveBeenCalledWith('mdi:home', '#0000ff')
    expect(ctx.calls('drawImage')).toHaveLength(0)
    await result
    const size = 10 * 4.8
    expect(ctx.calls('drawImage')[0].args).toEqual(['icon-image', -size / 2, -size / 2, size, size])
  })

  it('draws uploaded images when the label has no icon', async () => {
    const loadImage = vi.fn(() => Promise.resolve('upload-image'))
    const { ctx, result } = draw({ image: 'data:image/png;base64,AAAA' }, { loadImage })
    expect(loadImage).toHaveBeenCalledWith('data:image/png;base64,AAAA')
    await result
    expect(ctx.calls('drawImage')[0].args[0]).toBe('upload-image')
  })

  it('does not reject when an icon fails to load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { ctx, result } = draw({ icon: 'mdi:missing' }, { loadIcon: () => Promise.reject(new Error('404')) })
    await expect(result).resolves.toBeUndefined()
    expect(ctx.calls('drawImage')).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('draws nothing for an empty slot', () => {
    const { ctx, result } = draw({})
    expect(ctx.calls('fillText')).toHaveLength(0)
    expect(ctx.calls('drawImage')).toHaveLength(0)
    expect(result).toBeNull()
  })
})
