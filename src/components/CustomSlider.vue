<template>
  <div 
    class="custom-slider-container"
    ref="trackRef"
    @mousedown="startDrag"
    @touchstart.prevent="startDrag"
  >
    <div class="slider-track">
      <div class="slider-fill" :style="{ width: fillPercentage + '%' }"></div>
    </div>
    <div class="slider-thumb" :style="{ left: fillPercentage + '%' }"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 }
})

const emit = defineEmits(['update:modelValue'])

const trackRef = ref(null)
const isDragging = ref(false)

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
  height: 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: none;
}

.slider-track {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.slider-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 4px;
  transition: width 0.05s linear;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 5px rgba(0,0,0,0.5), 0 0 0 2px rgba(16, 185, 129, 0.3);
  transition: left 0.05s linear, box-shadow 0.2s;
  z-index: 2;
}

.custom-slider-container:hover .slider-thumb,
.custom-slider-container:active .slider-thumb {
  box-shadow: 0 2px 8px rgba(0,0,0,0.6), 0 0 0 4px rgba(16, 185, 129, 0.5);
  transform: translate(-50%, -50%) scale(1.1);
}
</style>
