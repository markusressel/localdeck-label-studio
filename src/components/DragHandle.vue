<template>
  <div 
    class="sidebar-resizer" 
    :class="{ 'is-resizing': isResizing }" 
    @mousedown.prevent="startResize"
    @dblclick="emit('reset')"
  >
    <div class="resizer-line"></div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'

const emit = defineEmits(['resize', 'reset'])

const isResizing = ref(false)
const lastY = ref(0)

const startResize = (e) => {
  isResizing.value = true
  lastY.value = e.clientY
  document.body.style.cursor = 'row-resize'
  window.addEventListener('mousemove', doResize)
  window.addEventListener('mouseup', stopResize)
}

const doResize = (e) => {
  if (!isResizing.value) return
  // Use delta from last recorded position rather than e.movementY, 
  // as e.movementY can be inconsistent across browsers and OS scaling
  const delta = e.clientY - lastY.value
  lastY.value = e.clientY
  emit('resize', delta)
}

const stopResize = () => {
  isResizing.value = false
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', doResize)
  window.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
  window.removeEventListener('mousemove', doResize)
  window.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.sidebar-resizer {
  height: 12px;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -0.75rem 0;
  z-index: 50;
}

.sidebar-resizer:hover .resizer-line,
.sidebar-resizer.is-resizing .resizer-line {
  background: var(--primary);
}

.resizer-line {
  height: 4px;
  width: 40px;
  background: var(--card-border);
  border-radius: 4px;
  transition: background 0.2s;
}
</style>
