<template>
  <div class="color-picker-container" ref="pickerRef">
    <div class="color-picker-wrapper" :style="{ '--selected-color': modelValue }" @click="isOpen = !isOpen">
    </div>

    <div class="picker-dropdown" v-if="isOpen">
      <div class="dropdown-header">Theme Colors</div>
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
      
      <div class="hex-input-row">
        <input 
          type="text" 
          v-model="hexInput" 
          @input="onHexInput"
          class="hex-input"
          placeholder="#RRGGBB"
        />
        <label class="native-color-btn" title="Advanced Color Picker">
          <span class="iconify" data-icon="mdi:palette"></span>
          <input 
            type="color" 
            class="hidden-color-input" 
            :value="modelValue" 
            @input="selectColor($event.target.value)"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '#000000'
  }
})

const emit = defineEmits(['update:modelValue'])

const pickerRef = ref(null)
const isOpen = ref(false)
const hexInput = ref(props.modelValue)

// Predefined palette based on colors.css
const swatches = [
  '#ffffff', '#f8fafc', '#cbd5e1', '#64748b', '#334155', '#0f172a', '#000000',
  '#ef4444', '#dc2626', '#f59e0b', '#d97706', '#10b981', '#059669', '#3b82f6', '#2563eb'
]

watch(() => props.modelValue, (newVal) => {
  if (newVal !== hexInput.value) {
    hexInput.value = newVal
  }
})

const selectColor = (color) => {
  emit('update:modelValue', color)
  hexInput.value = color
  // Keep open to let them see, or close?
  // It's a picker, we can close it, but maybe they want to test multiple.
  // We'll leave it open unless they click outside.
}

const onHexInput = (e) => {
  let val = e.target.value
  if (!val.startsWith('#')) val = '#' + val
  if (/^#[0-9A-Fa-f]{6}$/.test(val) || /^#[0-9A-Fa-f]{3}$/.test(val)) {
    emit('update:modelValue', val)
  }
}

const handleClickOutside = (e) => {
  if (pickerRef.value && !pickerRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.color-picker-container {
  position: relative;
  display: inline-block;
}

.color-picker-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--selected-color);
  border: 2px solid var(--input-border);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
  flex-shrink: 0;
}

.color-picker-wrapper:hover {
  transform: scale(1.1);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.2);
  border-color: var(--primary);
}

.picker-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  z-index: 1000;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Arrow pointing up */
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

.dropdown-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--card-border);
  padding-bottom: 0.25rem;
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

.hex-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.hex-input {
  flex: 1;
  width: 100%;
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-main);
  font-family: monospace;
  font-size: 0.85rem;
}

.hex-input:focus {
  outline: none;
  border-color: var(--primary);
}

.native-color-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-muted);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: color 0.2s, border-color 0.2s;
}

.native-color-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.hidden-color-input {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  opacity: 0;
  cursor: pointer;
}
</style>
