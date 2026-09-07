<template>
  <div class="color-picker-wrapper" :style="{ '--selected-color': modelValue }" @click="triggerInput">
    <input 
      type="color" 
      class="hidden-color-input" 
      ref="inputRef" 
      :value="modelValue" 
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: {
    type: String,
    default: '#000000'
  }
})

defineEmits(['update:modelValue'])

const inputRef = ref(null)

const triggerInput = () => {
  if (inputRef.value) {
    inputRef.value.click()
  }
}
</script>

<style scoped>
.color-picker-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--selected-color);
  border: 2px solid var(--input-border, #475569);
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
  border-color: var(--primary, #10b981);
}

.color-picker-wrapper:focus-within {
  border-color: var(--primary, #10b981);
  box-shadow: 0 0 0 3px var(--primary-transparent);
}

.hidden-color-input {
  position: absolute;
  top: -100px;
  left: -100px;
  opacity: 0;
  pointer-events: none;
}
</style>
