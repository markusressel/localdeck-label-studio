import { describe, it, expect } from 'vitest'
import { denoiseSigma, clampFireflies, fireflyClampFor, FIREFLY_CLAMP_UNIFORM, DENOISE_UNTIL_SAMPLES } from '../utils/pathTracing.js'

describe('denoiseSigma', () => {
  it('denoises the first samples strongly and fades out', () => {
    expect(denoiseSigma(0)).toBe(4)
    expect(denoiseSigma(DENOISE_UNTIL_SAMPLES / 2)).toBe(2)
    expect(denoiseSigma(DENOISE_UNTIL_SAMPLES)).toBe(0)
    expect(denoiseSigma(1000)).toBe(0)
  })
})

describe('clampFireflies', () => {
  const shader = [
    'uniform float x;',
    'void main() {',
    '  gl_FragColor.rgb += lightRec.emission * state.throughputColor * misWeight;',
    '  gl_FragColor.rgb += lightRec.emission * state.throughputColor;',
    '  gl_FragColor.rgb += directLightContribution( - ray.direction, surf, state, hitPoint );',
    '  gl_FragColor.rgb += ( surf.emission * state.throughputColor );',
    '  gl_FragColor.rgb += sampleBackground( ray.direction, rand2( 2 ) ) * state.throughputColor;',
    '}'
  ].join('\n')

  it('wraps every light contribution but not the background', () => {
    const { source, replaced } = clampFireflies(shader)
    expect(replaced).toBe(4)
    expect(source.match(/\+= clampFirefly\( /g)).toHaveLength(4)
    expect(source).toContain('gl_FragColor.rgb += sampleBackground(')
    expect(source).toContain('vec3 clampFirefly( vec3 c )')
    expect(source).toContain(`uniform float ${FIREFLY_CLAMP_UNIFORM};`)
    expect(source.indexOf('vec3 clampFirefly')).toBeLessThan(source.indexOf('void main() {'))
  })

  it('leaves unknown shaders untouched', () => {
    const other = 'void main() { gl_FragColor = vec4(1.0); }'
    expect(clampFireflies(other)).toEqual({ source: other, replaced: 0 })
  })
})

describe('fireflyClampFor', () => {
  it('scales with the LED intensity, so brighter LEDs keep their light', () => {
    expect(fireflyClampFor(3000)).toBe(300)
    expect(fireflyClampFor(6000)).toBeGreaterThan(fireflyClampFor(3000))
    expect(fireflyClampFor(0)).toBe(1)
  })
})
