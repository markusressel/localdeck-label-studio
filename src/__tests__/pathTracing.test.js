import { describe, it, expect } from 'vitest'
import { denoiseSigma, DENOISE_UNTIL_SAMPLES } from '../utils/pathTracing.js'

describe('denoiseSigma', () => {
  it('denoises the first samples strongly and fades out', () => {
    expect(denoiseSigma(0)).toBe(4)
    expect(denoiseSigma(DENOISE_UNTIL_SAMPLES / 2)).toBe(2)
    expect(denoiseSigma(DENOISE_UNTIL_SAMPLES)).toBe(0)
    expect(denoiseSigma(1000)).toBe(0)
  })
})
