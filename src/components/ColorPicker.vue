<template>
  <div class="color-picker-container" ref="pickerRef">
    <div class="color-picker-wrapper" :style="{ '--selected-color': modelValue }" @click="toggleDropdown"></div>

    <Teleport to="body">
    <Transition name="fade-scale">
      <div class="picker-dropdown" v-if="isOpen" :style="dropdownStyle" ref="dropdownRef">
        <!-- Saturation/Value Area -->
        <div 
          class="color-area" 
          ref="areaRef" 
          @mousedown="onAreaMouseDown"
          :style="{ backgroundColor: 'hsl(' + hsv.h + ', 100%, 50%)' }"
        >
          <div class="color-area-white"></div>
          <div class="color-area-black"></div>
          <div 
            class="color-pointer" 
            :style="{ 
              left: hsv.s + '%', 
              top: (100 - hsv.v) + '%',
              backgroundColor: modelValue
            }"
          ></div>
        </div>

        <!-- Hue Slider -->
        <div class="slider-container">
          <div class="hue-slider" ref="hueRef" @mousedown="onHueMouseDown">
            <div class="slider-pointer" :style="{ left: (hsv.h / 360 * 100) + '%', backgroundColor: 'hsl(' + hsv.h + ', 100%, 50%)' }"></div>
          </div>
        </div>

        <!-- Inputs: HEX and RGB -->
        <div class="inputs-grid">
          <div class="input-group">
            <label>HEX</label>
            <input type="text" v-model="hexInput" @change="onHexChange" @blur="onHexChange" />
          </div>
          <div class="rgb-inputs">
            <div class="input-group">
              <label>R</label>
              <input type="number" min="0" max="255" v-model.number="rgbInput.r" @change="onRgbChange" />
            </div>
            <div class="input-group">
              <label>G</label>
              <input type="number" min="0" max="255" v-model.number="rgbInput.g" @change="onRgbChange" />
            </div>
            <div class="input-group">
              <label>B</label>
              <input type="number" min="0" max="255" v-model.number="rgbInput.b" @change="onRgbChange" />
            </div>
          </div>
        </div>

        <!-- Swatches -->
        <div class="swatches-section">
          <div class="dropdown-header">Presets</div>
          <div class="swatches-grid">
            <div 
              v-for="color in swatches" 
              :key="color"
              class="swatch"
              :style="{ backgroundColor: color }"
              :class="{ 'is-active': modelValue.toLowerCase() === color.toLowerCase() }"
              @click="selectColor(color)"
            ></div>
          </div>
        </div>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, reactive } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '#10b981'
  }
})

const emit = defineEmits(['update:modelValue'])

const pickerRef = ref(null)
const areaRef = ref(null)
const hueRef = ref(null)
const dropdownRef = ref(null)
const isOpen = ref(false)
const dropdownStyle = reactive({ top: '0px', left: '0px', transform: 'translateX(-50%)' })

const swatches = [
  '#ffffff', '#f8fafc', '#cbd5e1', '#64748b', '#334155', '#0f172a', '#000000',
  '#ef4444', '#dc2626', '#f59e0b', '#d97706', '#10b981', '#059669', '#3b82f6', '#2563eb'
]

// State
const hexInput = ref(props.modelValue)
const rgbInput = reactive({ r: 0, g: 0, b: 0 })
const hsv = reactive({ h: 0, s: 0, v: 0 })

// Converters
const hexToRgb = (hex) => {
  let r = 0, g = 0, b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) * 17
    g = parseInt(hex[2] + hex[2], 16) * 17
    b = parseInt(hex[3] + hex[3], 16) * 17
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16)
    g = parseInt(hex.substring(3, 5), 16)
    b = parseInt(hex.substring(5, 7), 16)
  }
  return { r, g, b }
}

const rgbToHex = (r, g, b) => {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)
}

const rgbToHsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255
  let max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, v = max
  let d = max - min
  s = max === 0 ? 0 : d / max
  if (max === min) {
    h = 0
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: h * 360, s: s * 100, v: v * 100 }
}

const hsvToRgb = (h, s, v) => {
  let r, g, b
  h /= 360; s /= 100; v /= 100
  let i = Math.floor(h * 6)
  let f = h * 6 - i
  let p = v * (1 - s)
  let q = v * (1 - f * s)
  let t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break
    case 1: r = q, g = v, b = p; break
    case 2: r = p, g = v, b = t; break
    case 3: r = p, g = q, b = v; break
    case 4: r = t, g = p, b = v; break
    case 5: r = v, g = p, b = q; break
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

const updateFromHex = (hex) => {
  const { r, g, b } = hexToRgb(hex)
  rgbInput.r = r; rgbInput.g = g; rgbInput.b = b
  const { h, s, v } = rgbToHsv(r, g, b)
  hsv.h = h; hsv.s = s; hsv.v = v
}

updateFromHex(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  if (newVal !== hexInput.value) {
    hexInput.value = newVal
    updateFromHex(newVal)
  }
})

const triggerUpdate = () => {
  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v)
  rgbInput.r = r; rgbInput.g = g; rgbInput.b = b
  const hex = rgbToHex(r, g, b)
  hexInput.value = hex
  emit('update:modelValue', hex)
}

const onHexChange = () => {
  let val = hexInput.value
  if (!val.startsWith('#')) val = '#' + val
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    emit('update:modelValue', val)
    updateFromHex(val)
  }
}

const onRgbChange = () => {
  const hex = rgbToHex(rgbInput.r, rgbInput.g, rgbInput.b)
  hexInput.value = hex
  emit('update:modelValue', hex)
  updateFromHex(hex)
}

const selectColor = (color) => {
  emit('update:modelValue', color)
  hexInput.value = color
  updateFromHex(color)
}

const updatePosition = () => {
  if (!pickerRef.value) return
  const rect = pickerRef.value.getBoundingClientRect()
  dropdownStyle.top = (rect.bottom + 8) + 'px'
  dropdownStyle.left = (rect.left + rect.width / 2) + 'px'
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
  } else {
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
  }
}

// Mouse dragging logic for Area
let isDraggingArea = false
const onAreaMouseDown = (e) => {
  isDraggingArea = true
  updateArea(e)
  document.addEventListener('mousemove', onAreaMouseMove)
  document.addEventListener('mouseup', onAreaMouseUp)
}
const onAreaMouseMove = (e) => {
  if (isDraggingArea) updateArea(e)
}
const onAreaMouseUp = () => {
  isDraggingArea = false
  document.removeEventListener('mousemove', onAreaMouseMove)
  document.removeEventListener('mouseup', onAreaMouseUp)
}
const updateArea = (e) => {
  if (!areaRef.value) return
  const rect = areaRef.value.getBoundingClientRect()
  let x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  let y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  hsv.s = (x / rect.width) * 100
  hsv.v = 100 - (y / rect.height) * 100
  triggerUpdate()
}

// Mouse dragging logic for Hue
let isDraggingHue = false
const onHueMouseDown = (e) => {
  isDraggingHue = true
  updateHue(e)
  document.addEventListener('mousemove', onHueMouseMove)
  document.addEventListener('mouseup', onHueMouseUp)
}
const onHueMouseMove = (e) => {
  if (isDraggingHue) updateHue(e)
}
const onHueMouseUp = () => {
  isDraggingHue = false
  document.removeEventListener('mousemove', onHueMouseMove)
  document.removeEventListener('mouseup', onHueMouseUp)
}
const updateHue = (e) => {
  if (!hueRef.value) return
  const rect = hueRef.value.getBoundingClientRect()
  let x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  hsv.h = (x / rect.width) * 360
  triggerUpdate()
}

const handleClickOutside = (e) => {
  if (isOpen.value && pickerRef.value && !pickerRef.value.contains(e.target)) {
    if (dropdownRef.value && dropdownRef.value.contains(e.target)) return
    isOpen.value = false
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<style scoped>
.color-picker-container {
  display: inline-block;
}

.color-picker-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--selected-color);
  border: 2px solid var(--input-border);
  cursor: pointer;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  flex-shrink: 0;
}

.color-picker-wrapper:hover {
  transform: scale(1.1);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.2);
  border-color: var(--primary);
}

.color-picker-container:focus-within .color-picker-wrapper {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-transparent);
}

.picker-dropdown {
  position: fixed;
  width: 240px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
  z-index: 99999;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.picker-dropdown::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: var(--card-bg);
  border-left: 1px solid var(--card-border);
  border-top: 1px solid var(--card-border);
}

.color-area {
  width: 100%;
  height: 140px;
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  cursor: crosshair;
}

.color-area-white {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #fff, rgba(255,255,255,0));
}

.color-area-black {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, #000, rgba(0,0,0,0));
}

.color-pointer {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.slider-container {
  padding: 0 4px;
}

.hue-slider {
  width: 100%;
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
  position: relative;
  cursor: pointer;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
}

.slider-pointer {
  position: absolute;
  top: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  transform: translateX(-50%);
  pointer-events: none;
}

.inputs-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rgb-inputs {
  display: flex;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  align-items: center;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  overflow: hidden;
  flex: 1;
}

.input-group:focus-within {
  border-color: var(--primary);
}

.input-group label {
  padding: 0 0.5rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  border-right: 1px solid var(--input-border);
  background: rgba(0,0,0,0.2);
}

.input-group input {
  width: 100%;
  min-width: 0;
  padding: 0.4rem;
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 0.85rem;
  text-align: center;
  font-family: monospace;
}

.input-group input:focus {
  outline: none;
}

.dropdown-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.swatches-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.1s, border-color 0.1s;
}

.swatch:hover {
  transform: scale(1.1);
  border-color: rgba(255,255,255,0.5);
}

.swatch.is-active {
  border: 2px solid var(--primary);
  transform: scale(1.1);
}

/* Animations */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top center;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.95) !important;
}
</style>
