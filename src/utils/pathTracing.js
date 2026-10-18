// Samples after which the path traced image is clean enough to show undenoised
export const DENOISE_UNTIL_SAMPLES = 64

/**
 * Strength (sigma) of the edge-preserving denoiser for the current sample
 * count: strong for the first noisy samples, fading out so the converged
 * image stays sharp.
 *
 * @param {number} samples
 * @returns {number} 0 means no denoising
 */
export const denoiseSigma = (samples) =>
  samples >= DENOISE_UNTIL_SAMPLES ? 0 : 4 * (1 - samples / DENOISE_UNTIL_SAMPLES)
