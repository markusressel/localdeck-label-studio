<template>
  <div
    class="scale-wrapper"
    :style="wrapperStyle"
    :class="['effect-' + effectiveLightEffect, { 'room-dark': darkRoom && !printMode }]"
    ref="previewRef"
  >
    <!-- LED light escaping below the cap onto the case -->
    <div v-if="!printMode" class="led-spill"></div>
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
        <div class="cap-wall-glow"></div>
        <div class="wall-hotspot"></div>
        <div class="insert-base"></div>
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

const { preview2dLedIntensity, preview2dTranslucency, preview2dFalloff, updateLabel, globalStyle } = useStore()

const props = defineProps({
  label: { type: Object, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  scale: { type: Number, default: 1 },
  material: { type: String, default: 'transparent' },
  // Overrides for the global label settings; defaults to the store's globalStyle
  globals: { type: Object, default: null },
  printMode: { type: Boolean, default: false },
  darkRoom: { type: Boolean, default: false }
})

const style = computed(() => resolveLabelStyle(props.label, { ...globalStyle.value, ...props.globals }))

const effectiveLightEffect = computed(() => style.value.lightEffect)
const effectiveLightColor = computed(() => style.value.lightColor)
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
    height: `calc((${props.height + 4}mm) * ${props.scale})`,
    // Set on the wrapper so the LED spill outside the cap can use them too
    '--led-color': effectiveLightEffect.value === 'rainbow' ? 'hsl(var(--led-hue) 100% 55%)' : effectiveLightColor.value,
    '--led-brightness': effectiveLightBrightness.value,
    '--p2d-intensity': preview2dLedIntensity.value,
    '--p2d-translucency': preview2dTranslucency.value,
    '--p2d-falloff': preview2dFalloff.value,
    '--scale': props.scale
  }
})

const innerStyle = computed(() => {
  return {
    '--label-width': props.width + 'mm',
    '--label-height': props.height + 'mm',
    'transform': `scale(${props.scale})`,
    'transform-origin': 'top left'
  }
})
</script>

<style scoped>
/* Animated by the breathing and rainbow effects; every LED layer reads them */
@property --led-breath {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}
@property --led-hue {
  syntax: '<angle>';
  inherits: true;
  initial-value: 0deg;
}

.scale-wrapper {
  position: relative;
  transition: width 0.2s ease, height 0.2s ease;
  /* Current LED output: 0-1 at intensity 1 */
  --led-level: calc(var(--led-brightness, 0) * var(--led-breath) * var(--p2d-intensity, 1));
}

/*
 * Model of the real keycap: a clear cover over a white frosted insert, with the
 * printed label between them. The LED sits below the bottom edge, so the clear
 * walls glow strongly, brightest at the bottom, while the insert and label
 * stay white and only pick up a tint, mainly in the lower part.
 */
.led-spill {
  position: absolute;
  inset: 20% 8% -12% 8%;
  border-radius: 30%;
  background: var(--led-color);
  opacity: calc(var(--led-level) * 0.35);
  filter: blur(calc(var(--scale, 1) * 6px));
  pointer-events: none;
}
.room-dark .led-spill {
  opacity: calc(var(--led-level) * 0.7);
}

.keycap-outer {
  position: absolute;
  top: 0; left: 0;
  width: calc(var(--label-width) + 4mm);
  height: calc(var(--label-height) + 4mm);
  padding: 2mm;
  /* Clear plastic walls, lit by the room */
  background-color: #d8dadd;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden; 
  box-shadow: 0 6px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.2s ease, background-color 0.3s ease, box-shadow 0.3s ease;
}

/* Dark room: the walls only show LED light */
.keycap-outer.is-dark-room {
  background-color: #08080a;
  box-shadow: 0 4px 15px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8);
}

/* LED light carried through the clear walls: saturated at the bottom, paler at the top */
.cap-wall-glow {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: linear-gradient(
    to top,
    var(--led-color) 0%,
    color-mix(in srgb, var(--led-color) 80%, #fff) 35%,
    color-mix(in srgb, var(--led-color) 40%, transparent) 100%
  );
  opacity: calc(var(--led-level) * 0.85);
  pointer-events: none;
}
.is-dark-room .cap-wall-glow {
  opacity: var(--led-level);
}

/* The LED itself, seen through the bottom wall */
.wall-hotspot {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 30% 14% at 50% 100%, #fff 0%, color-mix(in srgb, var(--led-color) 60%, #fff) 40%, transparent 100%);
  opacity: var(--led-level);
  mix-blend-mode: screen;
  pointer-events: none;
}

/* What is behind the label: the paper itself, or for film the clear keycap base */
.insert-base {
  position: absolute;
  inset: 2mm;
  border-radius: 2px;
  background: #f2f2f0;
  pointer-events: none;
}

/* Paper covers the insert with its own matte, slightly warm white */
.material-thin-paper .insert-base { background: #f4f2ed; }
.material-thick-paper .insert-base { background: #f3f0e9; }

/* Dark room: the insert is lit only from behind by the LED */
.is-dark-room .insert-base {
  /* Less light gets through paper, and what does is scattered closer to white */
  background: color-mix(in srgb, var(--led-color) calc(var(--p2d-translucency) * 30%), #fff);
  filter: brightness(min(1.2, calc(0.04 + var(--led-level) * (0.2 + 0.75 * var(--p2d-translucency)))));
}

/*
 * Film has no backing: behind the print is the clear keycap base, so the lit
 * walls and the room show through, dimmed a little by the frosted plastic and
 * the switch below.
 */
.keycap-outer.material-transparent .insert-base {
  background: rgba(216, 218, 221, 0.55);
  filter: none;
}
.keycap-outer.material-transparent.is-dark-room .insert-base {
  background: rgba(8, 8, 10, 0.6);
}

/*
 * LED light passing through the label. The switch stem blocks the direct path
 * to the upper part, so mainly the lower part is tinted. Paper scatters the
 * light further up, but lets less through.
 */
.diffused-led-glow {
  position: absolute;
  inset: 2mm;
  border-radius: 2px;
  background: radial-gradient(
    ellipse calc(80% + var(--p2d-falloff) * 2%) calc(50% + var(--p2d-falloff) * 2%) at 50% 100%,
    var(--led-color) 0%,
    color-mix(in srgb, var(--led-color) 35%, transparent) 55%,
    transparent 100%
  );
  pointer-events: none;
  opacity: calc(var(--led-level) * var(--p2d-translucency) * 0.85);
  filter: blur(calc(var(--p2d-falloff) * 0.5px));
}

/* Through film the light reaches the label's side edges and up past the text */
.keycap-outer.material-transparent .diffused-led-glow {
  background: radial-gradient(
    ellipse calc(120% + var(--p2d-falloff) * 2%) calc(72% + var(--p2d-falloff) * 2%) at 50% 100%,
    var(--led-color) 0%,
    color-mix(in srgb, var(--led-color) 55%, transparent) 50%,
    transparent 100%
  );
}

/*
 * Film only: a darker rim right inside the cover's lip, where the walls of the
 * keycap base attach and block part of the light. Paper hides it.
 */
.keycap-outer.material-transparent:not(.is-print-mode) .label-insert::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 2px;
  box-shadow: 0 0 0.6mm 0.25mm rgba(0, 0, 0, 0.3) inset, 0 0 1.4mm 0.4mm rgba(0, 0, 0, 0.15) inset;
  pointer-events: none;
}

/*
 * Film only: the shadow of the switch stem mount, a round post slightly above
 * the middle. It blocks about as much light as the rim.
 */
.keycap-outer.material-transparent:not(.is-print-mode) .label-insert::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background: radial-gradient(circle at 50% calc(50% - 0.8mm), rgba(0, 0, 0, 0.3) 1.2mm, rgba(0, 0, 0, 0.15) 2.2mm, transparent 3.2mm);
  pointer-events: none;
}

/* LED glare at the bottom edge of the label: visible through film, mostly hidden by paper */
.keycap-led-glow {
  position: absolute;
  inset: 2mm;
  background: radial-gradient(ellipse 40% 16% at 50% 100%, #fff 0%, var(--led-color) 45%, transparent 100%);
  opacity: calc(var(--led-level) * var(--p2d-translucency) * var(--p2d-translucency) * 0.8);
  mix-blend-mode: screen;
  pointer-events: none;
}

/* The insert, its tint and glare sit just below the label */
.insert-base, .diffused-led-glow, .keycap-led-glow {
  z-index: 1;
}

/* Bevel and gloss of the clear cover */
.plastic-cap {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  border-radius: 5px;
  
  border-style: solid;
  border-width: 2mm;
  border-top-color: rgba(255, 255, 255, 0.35);
  border-bottom-color: rgba(0, 0, 0, 0.12);
  border-left-color: rgba(255, 255, 255, 0.12);
  border-right-color: rgba(0, 0, 0, 0.06);
  
  background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 40%);
  background-clip: padding-box;
}
.is-dark-room .plastic-cap {
  border-top-color: rgba(255, 255, 255, 0.12);
  border-left-color: rgba(255, 255, 255, 0.05);
  background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%);
  background-clip: padding-box;
}

/* The flat top lip of the cover around the label window, and the window's recess edge */
.plastic-cap::after {
  content: '';
  position: absolute;
  inset: -1mm;
  /* Outer radius minus the 1mm lip leaves the label window slightly rounded */
  border-radius: 1.6mm;
  border: 1mm solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.25) inset, 0 0.4mm 0.6mm rgba(0, 0, 0, 0.12) inset;
}
.is-dark-room .plastic-cap::after {
  border-color: rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.5) inset;
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

/* RGB Light Effects: they animate --led-breath and --led-hue, which every LED layer reads */
@keyframes led-breathing {
  0%, 100% { --led-breath: 0.2; }
  50% { --led-breath: 1; }
}
@keyframes led-rainbow {
  0% { --led-hue: 0deg; }
  100% { --led-hue: 360deg; }
}

.scale-wrapper.effect-breathing {
  animation: led-breathing 3s infinite ease-in-out;
}
.scale-wrapper.effect-rainbow {
  animation: led-rainbow 3s infinite linear;
}
</style>

