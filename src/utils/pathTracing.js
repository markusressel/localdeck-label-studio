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

// Light contributions in three-gpu-pathtracer's PhysicalPathTracingMaterial
// fragment shader: lights hit by a ray (with and without MIS), direct light
// sampling, and surface emission
const CONTRIBUTIONS = [
  'lightRec.emission * state.throughputColor * misWeight',
  'lightRec.emission * state.throughputColor',
  'directLightContribution( - ray.direction, surf, state, hitPoint )',
  '( surf.emission * state.throughputColor )'
]

/**
 * Clamp each light contribution of a path tracing sample, keeping its hue.
 * Rare, extremely bright paths (fireflies) then cannot leave dots that take
 * thousands of samples to average out. Slightly darkens real highlights
 * brighter than `maxValue`, which is the usual trade-off.
 *
 * @param {string} fragmentShader - PhysicalPathTracingMaterial fragment shader source
 * @param {number} maxValue - largest allowed channel value of a single contribution
 * @returns {{ source: string, replaced: number }} patched source and number of patched contributions
 */
export function clampFireflies(fragmentShader, maxValue) {
  let replaced = 0
  let source = fragmentShader
  for (const contribution of CONTRIBUTIONS) {
    const statement = `gl_FragColor.rgb += ${contribution};`
    const parts = source.split(statement)
    replaced += parts.length - 1
    source = parts.join(`gl_FragColor.rgb += clampFirefly( ${contribution} );`)
  }
  if (replaced === 0) return { source: fragmentShader, replaced }
  const helper = `
vec3 clampFirefly( vec3 c ) {
  float m = max( c.r, max( c.g, c.b ) );
  return m > ${maxValue.toFixed(1)} ? c * ( ${maxValue.toFixed(1)} / m ) : c;
}
`
  source = source.replace('void main() {', `${helper}\nvoid main() {`)
  return { source, replaced }
}
