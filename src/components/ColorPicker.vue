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
    // Some browsers require the element to be visible to click, but opacity 0 works.
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
  border: 2px solid var(--input-border);
  cursor: pointer;
  position: relative;
  /* overflow: hidden removed so the absolute child isn't clipped for positioning */
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s;
  flex-shrink: 0;
}

.color-picker-wrapper:hover {
  transform: scale(1.1);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.2);
  border-color: var(--primary);
}

.hidden-color-input {
  position: absolute;
  /* Position the hidden input exactly at the bottom of the circle */
  /* This forces the native OS color picker dialog to anchor below it, fixing the blocking issue! */
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  height: 1px;
  padding: 0;
  margin: 0;
  border: none;
  opacity: 0;
  pointer-events: none; /* Let the wrapper handle the click */
}
</style>

.color-picker-wrapper:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-transparent);
}
