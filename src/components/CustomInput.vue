<template>
  <div class="custom-input-wrapper" :class="{ 'has-icon': !!icon }">
    <Icon v-if="icon && !multiline" :icon="icon" class="input-icon" />
    <textarea 
      v-if="multiline"
      class="custom-input"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      v-bind="$attrs"
    ></textarea>
    <input 
      v-else
      type="text"
      class="custom-input"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      v-bind="$attrs"
    />
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineOptions({
  inheritAttrs: false
})

defineProps({
  modelValue: { type: [String, Number], default: '' },
  multiline: { type: Boolean, default: false },
  icon: { type: String, default: null }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.custom-input-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 1.1rem;
  pointer-events: none;
}

.custom-input {
  width: 100%;
  padding: 0.5rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--card-border);
  background: rgba(0,0,0,0.15);
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.custom-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  background: rgba(0,0,0,0.25);
}

.custom-input::placeholder {
  color: rgba(255,255,255,0.3);
}

.has-icon .custom-input {
  padding-left: 34px;
}

textarea.custom-input {
  resize: vertical;
  min-height: 42px;
  line-height: 1.4;
  padding: 0.6rem 0.8rem;
}

textarea.custom-input::-webkit-scrollbar {
  width: 8px;
}
textarea.custom-input::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
}
textarea.custom-input::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
}
</style>
