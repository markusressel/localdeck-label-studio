<template>
  <div class="scale-wrapper" :style="wrapperStyle" ref="previewRef">
    <div 
      class="keycap-outer" 
      :style="innerStyle" 
      :class="[
        'material-' + material,
        'effect-' + effectiveLightEffect,
        { 'is-print-mode': printMode, 'is-dark-room': darkRoom && !printMode }
      ]"
    >
      <!-- Physical Keycap Layers (Hidden in print mode) -->
      <template v-if="!printMode">
        <div class="material-layer"></div>
        <div class="diffused-led-glow"></div>
        <div class="keycap-led-glow"></div>
        <div class="plastic-cap"></div>
      </template>

      <!-- The Label Insert -->
      <div class="label-insert">
        <div class="label-content" :style="{ backgroundColor: effectiveBackgroundColor, isolation: 'isolate', filter: `contrast(${label.contrast ?? 100}%) saturate(${label.saturation ?? 100}%)` }">
          <div v-if="label.image" class="label-image-container">
            <img :src="label.image" alt="Custom icon" class="custom-image" :style="{ transform: `scaleX(${label.iconFlipH ? -1 : 1}) scaleY(${label.iconFlipV ? -1 : 1})` }" />
          </div>
          <div 
            v-else-if="label.icon" 
            class="label-icon-container draggable-content" 
            :class="{ 'is-draggable': isCtrlPressed, 'is-dragging': currentlyDragging === 'icon', 'snapped-x': currentlyDragging === 'icon' && snappedX, 'snapped-y': currentlyDragging === 'icon' && snappedY }"
            :key="label.icon"
            @mousedown.stop="onMouseDown($event, 'icon')"
            :style="{ 
              fontSize: effectiveIconSize + 'px', 
              color: isColorTransparent(effectiveIconColor) ? '#000' : effectiveIconColor,
              mixBlendMode: isColorTransparent(effectiveIconColor) ? 'destination-out' : 'normal',
              transform: `translate(${label.iconOffsetX || 0}px, ${label.iconOffsetY || 0}px) scaleX(${label.iconFlipH ? -1 : 1}) scaleY(${label.iconFlipV ? -1 : 1})`
            }"
          >
            <Icon 
              v-if="!isEmoji(label.icon)"
              :class="{ 'force-flat-icon': shouldForceFlatColor }"
              :icon="label.icon"
            />
            <span v-else :class="{ 'force-flat-icon': shouldForceFlatColor }">
              {{ emojify(label.icon) }}
            </span>
          </div>
          <div 
            v-if="label.text" 
            class="label-text draggable-content"
            :class="{ 'is-draggable': isCtrlPressed, 'is-dragging': currentlyDragging === 'text', 'snapped-x': currentlyDragging === 'text' && snappedX, 'snapped-y': currentlyDragging === 'text' && snappedY }"
            @mousedown.stop="onMouseDown($event, 'text')"
            :style="{ 
              fontSize: effectiveTextSize + 'px', 
              color: isColorTransparent(effectiveTextColor) ? '#000' : effectiveTextColor,
              mixBlendMode: isColorTransparent(effectiveTextColor) ? 'destination-out' : 'normal',
              transform: `translate(${label.textOffsetX || 0}px, ${label.textOffsetY || 0}px)`
            }"
            v-html="formattedLabelText"
          >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed, ref, onMounted, onUnmounted } from 'vue'

import { isEmoji, emojify } from '../utils/emojiUtils.js'
import { isColorTransparent } from '../utils/colorUtils.js'
import { resolveLabelStyle } from '../utils/labelStyle.js'
import { useStore } from '../composables/useStore.js'

const { preview2dLedIntensity, preview2dTranslucency, preview2dFalloff, updateLabel } = useStore()

const props = defineProps({
  label: { type: Object, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  scale: { type: Number, default: 1 },
  material: { type: String, default: 'transparent' },
  globalLightColor: { type: String, default: '#10b981' },
  globalLightBrightness: { type: Number, default: 80 },
  globalLightEffect: { type: String, default: 'static' },
  globalTextSize: { type: Number, default: 10 },
  globalTextColor: { type: String, default: '#000000' },
  globalIconSize: { type: Number, default: 24 },
  globalIconColor: { type: String, default: '#000000' },
  globalIconFlatten: { type: Boolean, default: false },
  globalBackgroundColor: { type: String, default: 'transparent' },
  printMode: { type: Boolean, default: false },
  darkRoom: { type: Boolean, default: false }
})

const style = computed(() => resolveLabelStyle(props.label, {
  textSize: props.globalTextSize,
  textColor: props.globalTextColor,
  iconSize: props.globalIconSize,
  iconColor: props.globalIconColor,
  iconFlatten: props.globalIconFlatten,
  backgroundColor: props.globalBackgroundColor,
  lightColor: props.globalLightColor,
  lightBrightness: props.globalLightBrightness,
  lightEffect: props.globalLightEffect
}))

const effectiveLightEffect = computed(() => style.value.lightEffect)
const effectiveLightColor = computed(() => effectiveLightEffect.value === 'rainbow' ? '#ff0000' : style.value.lightColor)
const effectiveLightBrightness = computed(() => style.value.lightBrightness / 100)
const effectiveTextSize = computed(() => style.value.textSize)
const effectiveTextColor = computed(() => style.value.textColor)
const effectiveIconSize = computed(() => style.value.iconSize)
const effectiveIconColor = computed(() => style.value.iconColor)
const effectiveBackgroundColor = computed(() => style.value.backgroundColor)

const formattedLabelText = computed(() => {
  if (!props.label.text) return ''
  let text = props.label.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    
  text = emojify(text);
  return text.replace(/:([a-zA-Z0-9\-:]+):/g, '<Icon icon="$1" />')
})

const previewRef = ref(null)

const isCtrlPressed = ref(false)
const currentlyDragging = ref(null)
const snappedX = ref(false)
const snappedY = ref(false)

const shouldForceFlatColor = computed(() => style.value.iconFlatten)

const handleKeyDown = (e) => { if (e.key === 'Control' || e.key === 'Meta') isCtrlPressed.value = true }
const handleKeyUp = (e) => { if (e.key === 'Control' || e.key === 'Meta') isCtrlPressed.value = false }

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

const onMouseDown = (e, target) => {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()

  const startX = e.clientX
  const startY = e.clientY
  const startOffsetX = props.label[target + 'OffsetX'] || 0
  const startOffsetY = props.label[target + 'OffsetY'] || 0
  
  currentlyDragging.value = target
  snappedX.value = startOffsetX === 0
  snappedY.value = startOffsetY === 0

  const onMouseMove = (moveEvent) => {
    // scale determines how many screen pixels map to one mm.
    // Wait, the label CSS is sized in mm, but transform: translate(px) uses px.
    // It's scaled by props.scale!
    const deltaX = (moveEvent.clientX - startX) / props.scale
    const deltaY = (moveEvent.clientY - startY) / props.scale

    let newX = startOffsetX + deltaX
    let newY = startOffsetY + deltaY

    // Snapping to center (0, 0)
    if (Math.abs(newX) < 2) { newX = 0; snappedX.value = true } else snappedX.value = false
    if (Math.abs(newY) < 2) { newY = 0; snappedY.value = true } else snappedY.value = false

    updateLabel(props.label.id, { [target + 'OffsetX']: newX, [target + 'OffsetY']: newY })
  }

  const onMouseUp = () => {
    currentlyDragging.value = null
    snappedX.value = false
    snappedY.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const wrapperStyle = computed(() => {
  if (props.printMode) {
    return {
      width: props.width + 'mm',
      height: props.height + 'mm'
    }
  }
  return {
    width: `calc((${props.width + 4}mm) * ${props.scale})`,
    height: `calc((${props.height + 4}mm) * ${props.scale})`
  }
})

const innerStyle = computed(() => {
  return {
    '--label-width': props.width + 'mm',
    '--label-height': props.height + 'mm',
    '--led-color': effectiveLightColor.value,
    '--led-brightness': effectiveLightBrightness.value,
    '--p2d-intensity': preview2dLedIntensity.value,
    '--p2d-translucency': preview2dTranslucency.value,
    '--p2d-falloff': preview2dFalloff.value,
    'transform': `scale(${props.scale})`,
    'transform-origin': 'top left'
  }
})
</script>

<style scoped>
.scale-wrapper {
  position: relative;
  transition: width 0.2s ease, height 0.2s ease;
}

.keycap-outer {
  position: absolute;
  top: 0; left: 0;
  width: calc(var(--label-width) + 4mm);
  height: calc(var(--label-height) + 4mm);
  padding: 2mm;
  background-color: #e2e2e4; 
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden; 
  box-shadow: 0 6px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.2s ease, background-color 0.3s ease, box-shadow 0.3s ease;
}

.keycap-outer.is-dark-room {
  background-color: #1a1a1c;
  box-shadow: 0 4px 15px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6);
}

.keycap-led-glow {
  position: absolute;
  bottom: -15%;
  left: 50%;
  transform: translateX(-50%);
  width: 150%;
  height: 120%;
  background: radial-gradient(circle at 50% 100%, #ffffff 0%, var(--led-color) 20%, transparent calc(40% + var(--p2d-falloff) * 5%));
  opacity: var(--led-brightness);
  pointer-events: none;
  z-index: 1;
  mix-blend-mode: screen;
}

.plastic-cap {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  border-radius: 5px;
  
  border-style: solid;
  border-width: 2mm;
  border-top-color: rgba(255, 255, 255, 0.5);   
  border-bottom-color: rgba(0, 0, 0, 0.4);      
  border-left-color: rgba(255, 255, 255, 0.15);   
  border-right-color: rgba(0, 0, 0, 0.15);
  
  background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 40%);
  background-clip: padding-box;
}

.plastic-cap::before {
  content: '';
  position: absolute;
  inset: -2mm;
  border-radius: 5px;
  border: 2mm solid transparent;
  border-bottom-color: var(--led-color);
  border-left-color: var(--led-color);
  border-right-color: var(--led-color);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
  mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%);
  opacity: calc(var(--led-brightness) * var(--p2d-translucency) * 1.5);
  mix-blend-mode: screen;
  filter: drop-shadow(0 0 calc(var(--p2d-falloff) * 1px) var(--led-color));
}

.plastic-cap::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3) inset, 0 1px 2px rgba(255,255,255,0.5) inset;
}

.label-insert {
  position: relative;
  width: var(--label-width);
  height: var(--label-height);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
}

.material-layer {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  z-index: 1;
  transition: background 0.3s, box-shadow 0.3s;
  background: rgba(255, 255, 255, calc(1 - var(--p2d-translucency)));
  box-shadow: 0 1px 3px rgba(0,0,0, calc((1 - var(--p2d-translucency)) * 0.2)) inset;
}

/* Dark Room Materials - No ambient light, pitch black */
.keycap-outer.is-dark-room {
  background-color: #000000;
  box-shadow: 0 4px 15px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8);
}

.keycap-outer.is-dark-room .material-layer {
  background: rgba(0, 0, 0, calc(1 - var(--p2d-translucency)));
  box-shadow: none;
}

/* Diffused LED glowing THROUGH the paper */
.diffused-led-glow {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: radial-gradient(circle at 50% 90%, var(--led-color) 0%, transparent calc(40% + var(--p2d-falloff) * 5%));
  z-index: 1;
  pointer-events: none;
  transition: opacity 0.3s, filter 0.3s;
  opacity: calc(var(--led-brightness) * var(--p2d-intensity));
  filter: blur(calc(var(--p2d-falloff) * 1px));
}

.label-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 1mm;
  box-sizing: border-box;
  mix-blend-mode: multiply; 
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.label-icon-container, .label-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-height: 0;
}

.custom-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.draggable-content {
  position: relative;
}
.draggable-content.is-dragging {
  outline: 1px dashed var(--primary);
  outline-offset: 2px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 0;
}

.draggable-content.snapped-y::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(var(--label-width) * 1.5);
  height: 1px;
  border-top: 1px dashed var(--primary);
  pointer-events: none;
  z-index: 10;
}
.draggable-content.snapped-x::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  height: calc(var(--label-height) * 1.5);
  width: 1px;
  border-left: 1px dashed var(--primary);
  pointer-events: none;
  z-index: 10;
}

.draggable-content.is-draggable {
  cursor: grab;
}
.draggable-content.is-draggable:active {
  cursor: grabbing;
}
.label-text {
  text-align: center;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  overflow: hidden;
  width: 100%;
  line-height: 1.15;
}

/* Print Mode overrides - used both in CSS @media print AND on-screen previewMode */
.keycap-outer.is-print-mode {
  padding: 0 !important;
  width: var(--label-width) !important;
  height: var(--label-height) !important;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  border-radius: 0 !important;
  transform: none !important; /* Printing doesn't use scale */
}

.keycap-outer.is-print-mode .label-insert {
  border-radius: 0 !important;
}

.keycap-outer.is-print-mode .label-content {
  mix-blend-mode: normal !important;
}

@media print {
  /* Failsafe to ensure normal UI elements are hidden */
  .no-print, .snap-line {
    display: none !important;
  }
}

/* RGB Light Effects */
@keyframes breathing-glow {
  0%, 100% { opacity: calc(var(--led-brightness) * 0.2); }
  50% { opacity: var(--led-brightness); }
}
@keyframes breathing-plastic {
  0%, 100% { opacity: calc(var(--led-brightness) * 1.2 * 0.2); }
  50% { opacity: calc(var(--led-brightness) * 1.2); }
}
@keyframes breathing-diffused-thin {
  0%, 100% { opacity: calc(var(--led-brightness) * 0.9 * 0.2); }
  50% { opacity: calc(var(--led-brightness) * 0.9); }
}
@keyframes breathing-diffused-thick {
  0%, 100% { opacity: calc(var(--led-brightness) * 0.65 * 0.2); }
  50% { opacity: calc(var(--led-brightness) * 0.65); }
}

.effect-breathing .keycap-led-glow {
  animation: breathing-glow 3s infinite ease-in-out;
}
.effect-breathing .plastic-cap::before {
  animation: breathing-plastic 3s infinite ease-in-out;
}
.effect-breathing.material-thin-paper .diffused-led-glow,
.effect-breathing .material-thin-paper .diffused-led-glow {
  animation: breathing-diffused-thin 3s infinite ease-in-out;
}
.effect-breathing.material-thick-paper .diffused-led-glow,
.effect-breathing .material-thick-paper .diffused-led-glow {
  animation: breathing-diffused-thick 3s infinite ease-in-out;
}

@keyframes rainbow-glow {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
@keyframes rainbow-plastic {
  0% { filter: drop-shadow(0 0 4px var(--led-color)) hue-rotate(0deg); }
  100% { filter: drop-shadow(0 0 4px var(--led-color)) hue-rotate(360deg); }
}
@keyframes rainbow-diffused-thin {
  0% { filter: blur(5px) hue-rotate(0deg); }
  100% { filter: blur(5px) hue-rotate(360deg); }
}
@keyframes rainbow-diffused-thick {
  0% { filter: blur(10px) hue-rotate(0deg); }
  100% { filter: blur(10px) hue-rotate(360deg); }
}

.effect-rainbow .keycap-led-glow {
  animation: rainbow-glow 3s infinite linear;
}
.effect-rainbow .plastic-cap::before {
  animation: rainbow-plastic 3s infinite linear;
}
.effect-rainbow.material-thin-paper .diffused-led-glow,
.effect-rainbow .material-thin-paper .diffused-led-glow {
  animation: rainbow-diffused-thin 3s infinite linear;
}
.effect-rainbow.material-thick-paper .diffused-led-glow,
.effect-rainbow .material-thick-paper .diffused-led-glow {
  animation: rainbow-diffused-thick 3s infinite linear;
}
</style>

