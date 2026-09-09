<template>
  <div 
    class="custom-switch-wrapper" 
    tabindex="0" 
    @keydown.space.prevent="toggleSwitch" 
    @click.prevent="toggleSwitch" 
    :class="{ 'is-checked': isChecked }"
  >
    <div class="switch-track">
      <div class="switch-thumb"></div>
    </div>
    <span class="switch-label" v-if="$slots.default">
      <slot></slot>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Boolean, Array],
    default: false
  },
  value: {
    type: [String, Number, Boolean, Object],
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const isChecked = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.includes(props.value)
  }
  return !!props.modelValue
})

const toggleSwitch = () => {
  const checked = !isChecked.value
  if (Array.isArray(props.modelValue)) {
    const newVal = [...props.modelValue]
    if (checked) {
      if (!newVal.includes(props.value)) {
        newVal.push(props.value)
      }
    } else {
      const idx = newVal.indexOf(props.value)
      if (idx > -1) newVal.splice(idx, 1)
    }
    emit('update:modelValue', newVal)
  } else {
    emit('update:modelValue', checked)
  }
}
</script>

<style scoped>
.custom-switch-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.85rem;
  color: var(--text-main);
  transition: opacity 0.2s;
}

.switch-track {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--input-border);
  position: relative;
  transition: background-color 0.2s ease, border-color 0.2s ease;
  flex-shrink: 0;
  border: 1px solid transparent;
}

.custom-switch-wrapper:hover .switch-track {
  border-color: var(--primary-transparent);
}

.custom-switch-wrapper.is-checked .switch-track {
  background: var(--primary);
}

.switch-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ffffff;
  position: absolute;
  top: 2px;
  left: 3px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transition: transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.custom-switch-wrapper.is-checked .switch-thumb {
  transform: translateX(16px);
}

.switch-label {
  line-height: 1.2;
}

.custom-switch-wrapper:focus-visible .switch-track {
  box-shadow: 0 0 0 3px var(--primary-transparent);
}
</style>
