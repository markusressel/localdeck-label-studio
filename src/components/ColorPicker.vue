<template>
  <div class="color-picker-container" ref="pickerRef">
    <div class="color-picker-wrapper" :style="{ '--selected-color': modelValue === 'transparent' ? 'transparent' : modelValue }"
      :class="{ 'is-transparent': modelValue === 'transparent' }" @click="toggleDropdown"></div>

    <Teleport to="body">
    <Transition name="fade-scale">
      <div class="picker-dropdown" v-if="isOpen" :style="dropdownStyle" ref="dropdownRef">
        <!-- Color Circle -->
        <div class="color-circle-container" style="display: flex; justify-content: center; align-items: center; margin-bottom: 0.5rem;">
          <div class="color-circle" ref="circleRef" @mousedown="onCircleMouseDown">
            <div class="color-circle-saturation"></div>
            <div class="color-circle-value" :style="{ opacity: 1 - (hsv.v / 100) }"></div>
            <div class="circle-pointer" :style="circlePointerStyle"></div>
          </div>
        </div>

        <!-- Value/Brightness Slider -->
        <div class="slider-container">
          <div class="value-slider" ref="valueRef" @mousedown="onValueMouseDown">
            <div class="value-bg" :style="{ background: `linear-gradient(to right, #000000, hsl(${hsv.h}, ${hsv.s}%, 50%))` }"></div>
            <div class="slider-pointer" :style="{ left: hsv.v + '%' }"></div>
          </div>
        </div>

        <!-- Alpha Slider -->
        <div class="slider-container mt-2">
          <div class="alpha-slider" ref="alphaRef" @mousedown="onAlphaMouseDown">
            <div class="alpha-bg"></div>
            <div class="alpha-color" :style="{ background: `linear-gradient(to right, transparent, rgb(${rgbInput.r}, ${rgbInput.g}, ${rgbInput.b}))` }"></div>
            <div class="slider-pointer" :style="{ left: (alpha * 100) + '%' }"></div>
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
            <div class="input-group">
              <label>A</label>
              <input type="number" min="0" max="100" v-model.number="alphaInt" @change="onAlphaIntChange" />
            </div>
          </div>
        </div>

        <!-- Swatches -->
        <div class="swatches-section">
          <div class="dropdown-header">Presets</div>
          <div class="swatches-grid">
        <div class="swatch is-transparent-swatch" 
          :class="{ 'is-active': modelValue === 'transparent' }"
          @click="selectColor('transparent')"
          title="Transparent"
        ></div>
            <div 
              v-for="color in swatches" 
              :key="color"
              class="swatch"
              :style="{ backgroundColor: color }"
              :class="{ 'is-active': modelValue && modelValue.toLowerCase() === color.toLowerCase() }"
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
import { ref, watch, onMounted, onUnmounted, reactive, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '#10b981'
  }
})

const emit = defineEmits(['update:modelValue'])

const pickerRef = ref(null)
const circleRef = ref(null)
const valueRef = ref(null)
const dropdownRef = ref(null)
const alphaRef = ref(null)
const alpha = ref(1)
const isOpen = ref(false)
const dropdownStyle = reactive({ top: '0px', left: '0px', transform: 'translateX(-50%)' })
const circlePointerStyle = computed(() => {
  const angle = (hsv.h - 90) * (Math.PI / 180)
  const radiusPercent = hsv.s / 100 * 50
  return {
    left: (50 + radiusPercent * Math.cos(angle)) + '%',
    top: (50 + radiusPercent * Math.sin(angle)) + '%',
    backgroundColor: `hsl(${hsv.h}, ${hsv.s}%, 50%)`
  }
})

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
  let r = 0, g = 0, b = 0, a = 1
  if (!hex) return { r, g, b, a }
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16) * 17
    g = parseInt(hex[2] + hex[2], 16) * 17
    b = parseInt(hex[3] + hex[3], 16) * 17
  } else if (hex.length === 5) {
    r = parseInt(hex[1] + hex[1], 16) * 17
    g = parseInt(hex[2] + hex[2], 16) * 17
    b = parseInt(hex[3] + hex[3], 16) * 17
    a = (parseInt(hex[4] + hex[4], 16) * 17) / 255
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16)
    g = parseInt(hex.substring(3, 5), 16)
    b = parseInt(hex.substring(5, 7), 16)
  } else if (hex.length === 9) {
    r = parseInt(hex.substring(1, 3), 16)
    g = parseInt(hex.substring(3, 5), 16)
    b = parseInt(hex.substring(5, 7), 16)
    a = parseInt(hex.substring(7, 9), 16) / 255
  }
  return { r, g, b, a }
}

const rgbToHex = (r, g, b, a = 1) => {
  const toHex = (n) => Math.round(n).toString(16).padStart(2, '0')
  const hex = "#" + toHex(r) + toHex(g) + toHex(b)
  if (a < 1) {
    return hex + toHex(a * 255)
  }
  return hex
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
  if (hex === 'transparent') {
    hexInput.value = 'transparent'
    return
  }
  const { r, g, b, a } = hexToRgb(hex)
  rgbInput.r = r; rgbInput.g = g; rgbInput.b = b
  alpha.value = a
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
  const hex = rgbToHex(r, g, b, alpha.value)
  hexInput.value = hex
  emit('update:modelValue', hex)
}

const onHexChange = () => {
  let val = hexInput.value
  if (!val.startsWith('#')) val = '#' + val
  if (/^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(val)) {
    emit('update:modelValue', val)
    updateFromHex(val)
  }
}

const alphaInt = computed({
  get: () => Math.round(alpha.value * 100),
  set: (val) => {
    alpha.value = Math.max(0, Math.min(100, val)) / 100
  }
})

const onAlphaIntChange = () => {
  triggerUpdate()
}

const onRgbChange = () => {
  const hex = rgbToHex(rgbInput.r, rgbInput.g, rgbInput.b, alpha.value)
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

// Mouse dragging logic for Circle
let isDraggingCircle = false
const onCircleMouseDown = (e) => {
  isDraggingCircle = true
  updateCircle(e)
  document.addEventListener('mousemove', onCircleMouseMove)
  document.addEventListener('mouseup', onCircleMouseUp)
}
const onCircleMouseMove = (e) => {
  if (isDraggingCircle) updateCircle(e)
}
const onCircleMouseUp = () => {
  isDraggingCircle = false
  document.removeEventListener('mousemove', onCircleMouseMove)
  document.removeEventListener('mouseup', onCircleMouseUp)
}
const updateCircle = (e) => {
  if (!circleRef.value) return
  const rect = circleRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left - rect.width / 2
  const y = e.clientY - rect.top - rect.height / 2
  const radius = Math.min(1, Math.sqrt(x*x + y*y) / (rect.width / 2))
  let angle = Math.atan2(y, x) * (180 / Math.PI)
  let hue = (angle + 90) % 360
  if (hue < 0) hue += 360
  hsv.h = hue
  hsv.s = radius * 100
  triggerUpdate()
}

// Mouse dragging logic for Alpha
let isDraggingAlpha = false
const onAlphaMouseDown = (e) => {
  isDraggingAlpha = true
  updateAlpha(e)
  document.addEventListener('mousemove', onAlphaMouseMove)
  document.addEventListener('mouseup', onAlphaMouseUp)
}
const onAlphaMouseMove = (e) => {
  if (isDraggingAlpha) updateAlpha(e)
}
const onAlphaMouseUp = () => {
  isDraggingAlpha = false
  document.removeEventListener('mousemove', onAlphaMouseMove)
  document.removeEventListener('mouseup', onAlphaMouseUp)
}
const updateAlpha = (e) => {
  if (!alphaRef.value) return
  const rect = alphaRef.value.getBoundingClientRect()
  let x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  alpha.value = x / rect.width
  triggerUpdate()
}

// Mouse dragging logic for Value
let isDraggingValue = false
const onValueMouseDown = (e) => {
  isDraggingValue = true
  updateValue(e)
  document.addEventListener('mousemove', onValueMouseMove)
  document.addEventListener('mouseup', onValueMouseUp)
}
const onValueMouseMove = (e) => {
  if (isDraggingValue) updateValue(e)
}
const onValueMouseUp = () => {
  isDraggingValue = false
  document.removeEventListener('mousemove', onValueMouseMove)
  document.removeEventListener('mouseup', onValueMouseUp)
}
const updateValue = (e) => {
  if (!valueRef.value) return
  const rect = valueRef.value.getBoundingClientRect()
  let x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  hsv.v = (x / rect.width) * 100
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

.color-picker-wrapper.is-transparent, .swatch.is-transparent-swatch {
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), 
                    linear-gradient(-45deg, #ccc 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #ccc 75%), 
                    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  background-color: white !important;
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
  width: 280px;
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

.color-circle {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  position: relative;
  cursor: crosshair;
  background: conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.color-circle-saturation {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle closest-side, #fff, transparent);
  pointer-events: none;
}
.color-circle-value {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #000;
  pointer-events: none;
}
.circle-pointer {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.6);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
}

.slider-container {
  padding: 0 4px;
}
.mt-2 { margin-top: 0.5rem; }

.value-slider, .alpha-slider {
  width: 100%;
  height: 14px;
  border-radius: 7px;
  position: relative;
  cursor: pointer;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
  overflow: hidden;
}
.value-bg {
  position: absolute;
  inset: 0;
  border-radius: 7px;
}
.alpha-bg {
  position: absolute;
  inset: 0;
  border-radius: 7px;
  background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), 
                    linear-gradient(-45deg, #ccc 25%, transparent 25%), 
                    linear-gradient(45deg, transparent 75%, #ccc 75%), 
                    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
  background-color: white;
}
.alpha-color {
  position: absolute;
  inset: 0;
  border-radius: 7px;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.input-group input[type="number"]::-webkit-inner-spin-button,
.input-group input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.input-group input[type="number"] {
  -moz-appearance: textfield;
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
