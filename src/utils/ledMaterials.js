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
 * @param {object} [options.occlusion] - shadow of the switch stem: from the LED towards `towards`,
 *   direct light fades out between `startMm` and `endMm`, leaving only the `indirect` share
 * @param {import('three').Vector3} options.occlusion.towards - world point the shadow extends to (key center)
 * @param {number} options.occlusion.startMm
 * @param {number} options.occlusion.endMm
 * @param {number} options.occlusion.indirect - light level in the shadow, 0..1
 * @returns {import('three').Material} the same material
 */
export function addLedFalloff(material, { ledPosition, falloffMm, nearMm = 0, rim = false, occlusion = null }) {
  if (rim) material.defines = { ...material.defines, LED_RIM: '' }
  if (occlusion) material.defines = { ...material.defines, LED_OCCLUSION: '' }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLedPosition = { value: ledPosition }
    shader.uniforms.uLedFalloff = { value: falloffMm }
    shader.uniforms.uLedNear = { value: nearMm }
    if (occlusion) {
      const direction = occlusion.towards.clone().sub(ledPosition).setY(0).normalize()
      shader.uniforms.uLedShadowDirection = { value: direction }
      shader.uniforms.uLedShadow = { value: [occlusion.startMm, occlusion.endMm, occlusion.indirect] }
    }
    shader.vertexShader = 'varying vec3 vLedWorldPosition;\n' + shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n  vLedWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;'
    )
    shader.fragmentShader = [
      'uniform vec3 uLedPosition;',
      'uniform float uLedFalloff;',
      'uniform float uLedNear;',
      'varying vec3 vLedWorldPosition;',
      '#ifdef LED_OCCLUSION',
      'uniform vec3 uLedShadowDirection;',
      'uniform float uLedShadow[3];',
      '#endif',
      ''
    ].join('\n') + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
  totalEmissiveRadiance *= exp(-max(distance(vLedWorldPosition, uLedPosition) - uLedNear, 0.0) / uLedFalloff);
  #ifdef LED_OCCLUSION
  // The stem blocks the direct path from the LED; beyond it only scattered light remains
  float alongShadow = dot(vLedWorldPosition - uLedPosition, uLedShadowDirection);
  totalEmissiveRadiance *= mix(1.0, uLedShadow[2], smoothstep(uLedShadow[0], uLedShadow[1], alongShadow));
  #endif
  #ifdef LED_RIM
  totalEmissiveRadiance *= pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
  #endif`
    )
  }
  // All LED materials share one shader program; uniforms stay per material
  material.customProgramCacheKey = () => 'led-falloff'
  return material
}
