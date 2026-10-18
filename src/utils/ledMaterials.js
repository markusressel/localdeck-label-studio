/**
 * Make a material's emission behave like light from a key's LED: it fades with
 * distance from the LED, and with `rim` it also concentrates at grazing view
 * angles, like light carried through a clear cover and leaving at its edges.
 *
 * Works for MeshStandardMaterial and MeshPhysicalMaterial. The emission color
 * and strength are still set through `emissive` / `emissiveIntensity`.
 *
 * @param {import('three').Material} material
 * @param {object} options
 * @param {import('three').Vector3} options.ledPosition - world position of the LED
 * @param {number} options.falloffMm - distance over which the light drops to ~37%
 * @param {number} [options.nearMm] - distance up to which the light is at full strength
 * @param {boolean} [options.rim] - add the edge glow
 * @returns {import('three').Material} the same material
 */
export function addLedFalloff(material, { ledPosition, falloffMm, nearMm = 0, rim = false }) {
  if (rim) material.defines = { ...material.defines, LED_RIM: '' }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLedPosition = { value: ledPosition }
    shader.uniforms.uLedFalloff = { value: falloffMm }
    shader.uniforms.uLedNear = { value: nearMm }
    shader.vertexShader = 'varying vec3 vLedWorldPosition;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n  vLedWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;'
    )
    shader.fragmentShader = [
      'uniform vec3 uLedPosition;',
      'uniform float uLedFalloff;',
      'uniform float uLedNear;',
      'varying vec3 vLedWorldPosition;',
      ''
    ].join('\n') + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
  totalEmissiveRadiance *= exp(-max(distance(vLedWorldPosition, uLedPosition) - uLedNear, 0.0) / uLedFalloff);
  #ifdef LED_RIM
  totalEmissiveRadiance *= pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
  #endif`
    )
  }
  // All LED materials share one shader program; uniforms stay per material
  material.customProgramCacheKey = () => 'led-falloff'
  return material
}
