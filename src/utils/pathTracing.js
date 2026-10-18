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

// Uniform holding the largest allowed channel value of a single contribution
export const FIREFLY_CLAMP_UNIFORM = 'fireflyClamp'

/**
 * Clamp each light contribution of a path tracing sample, keeping its hue.
 * Rare, extremely bright paths (fireflies) then cannot leave dots that take
 * thousands of samples to average out. Real light above the limit is lost
 * too, so the limit has to scale with the scene's light, see fireflyClampFor().
 * The limit is read from the FIREFLY_CLAMP_UNIFORM uniform.
 *
 * @param {string} fragmentShader - PhysicalPathTracingMaterial fragment shader source
 * @returns {{ source: string, replaced: number }} patched source and number of patched contributions
 */
export function clampFireflies(fragmentShader) {
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
uniform float ${FIREFLY_CLAMP_UNIFORM};
vec3 clampFirefly( vec3 c ) {
  float m = max( c.r, max( c.g, c.b ) );
  return m > ${FIREFLY_CLAMP_UNIFORM} ? c * ( ${FIREFLY_CLAMP_UNIFORM} / m ) : c;
}
`
  source = source.replace('void main() {', `${helper}\nvoid main() {`)
  return { source, replaced }
}

/**
 * Firefly clamp for LEDs of the given intensity (candela, with the scene in mm).
 * A surface d mm from an LED legitimately reflects up to about I / (4 * pi * d^2)
 * per sample, so 0.1 * I keeps all real light except within ~2mm of an LED.
 *
 * @param {number} ledIntensity
 * @returns {number}
 */
export const fireflyClampFor = (ledIntensity) => Math.max(1, 0.1 * ledIntensity)

/**
 * Adapt the number of path tracing samples rendered per animation frame to
 * the measured frame time: more while frames stay fast, fewer when they slow
 * down, so a strong GPU converges quickly and a weak one stays responsive.
 *
 * @param {number} current - samples per frame used for the last frame
 * @param {number} frameMs - duration of the last frame
 * @param {object} [options]
 * @param {number} [options.targetMs] - frame time to aim for
 * @param {number} [options.max]
 * @returns {number}
 */
export function nextSamplesPerFrame(current, frameMs, { targetMs = 25, max = 32 } = {}) {
  if (frameMs < targetMs * 0.8) return Math.min(max, current + 1)
  if (frameMs > targetMs * 1.25) return Math.max(1, Math.floor(current * 0.7))
  return current
}
