<template>
  <div 
    class="custom-slider-container"
    ref="trackRef"
    @mousedown="startDrag"
    @touchstart.prevent="startDrag"
  >
    <div class="slider-fill" :style="{ width: fillPercentage + '%' }"></div>
    <div class="slider-text" v-if="showValue">{{ formattedValue }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  showValue: { type: Boolean, default: false },
  unit: { type: String, default: '%' }
})

const emit = defineEmits(['update:modelValue'])

const trackRef = ref(null)
const isDragging = ref(false)

const formattedValue = computed(() => {
  return Number.isInteger(props.modelValue) 
    ? props.modelValue + props.unit 
    : props.modelValue.toFixed(1) + props.unit
})

const fillPercentage = computed(() => {
  const range = props.max - props.min
  const value = Math.max(props.min, Math.min(props.max, props.modelValue))
  return ((value - props.min) / range) * 100
})

const updateValueFromEvent = (clientX) => {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
  const percentage = x / rect.width
  const range = props.max - props.min
  let rawValue = props.min + (percentage * range)
  
  const steppedValue = Math.round(rawValue / props.step) * props.step
  emit('update:modelValue', Math.max(props.min, Math.min(props.max, steppedValue)))
}

const startDrag = (e) => {
  isDragging.value = true
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  updateValueFromEvent(clientX)
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchend', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging.value) return
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  updateValueFromEvent(clientX)
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)
}
</script>

<style scoped>
.custom-slider-container {
  position: relative;
  width: 100%;
  height: 34px;
  cursor: pointer;
  touch-action: none;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  border: 1px solid var(--card-border);
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
}

.slider-fill {
  height: 100%;
  background: var(--primary);
  opacity: 0.8;
  transition: width 0.05s linear, opacity 0.2s;
  position: relative;
}

.slider-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: rgba(255, 255, 255, 0.6);
  transition: all 0.2s;
}

.custom-slider-container:hover .slider-fill {
  opacity: 1;
}

.custom-slider-container:hover .slider-fill::after,
.custom-slider-container:active .slider-fill::after {
  background: rgba(255, 255, 255, 1);
  width: 5px;
  box-shadow: -2px 0 8px rgba(0,0,0,0.4);
}

.slider-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  pointer-events: none;
  z-index: 2;
}
</style>
