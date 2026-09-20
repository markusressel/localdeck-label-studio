<template>
  <div class="custom-checkbox-wrapper" tabindex="0" @keydown.space.prevent="toggleCheckbox" @click.prevent="toggleCheckbox" :class="{ 'is-checked': isChecked || indeterminate }">
    <div class="checkbox-box">
      <div v-show="isChecked && !indeterminate" class="icon-wrapper"><Icon icon="mdi:check" /></div>
      <div v-show="indeterminate" class="icon-wrapper"><Icon icon="mdi:minus" /></div>
    </div>
    <span class="checkbox-label" v-if="$slots.default">
      <slot></slot>
    </span>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Boolean, Array],
    default: false
  },
  value: {
    type: [String, Number, Boolean, Object],
    default: null
  },
  indeterminate: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const isChecked = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue.includes(props.value)
  }
  return !!props.modelValue
})

const toggleCheckbox = () => {
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
.custom-checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.85rem;
  color: var(--text-main);
  transition: color 0.2s;
}

.custom-checkbox-wrapper:hover .checkbox-box {
  border-color: var(--primary);
  background: var(--hover-bg);
}

.hidden-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.checkbox-box {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--input-border);
  background: var(--input-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.custom-checkbox-wrapper.is-checked .checkbox-box {
  background: var(--primary);
  border-color: var(--primary);
}

.custom-checkbox-wrapper.is-checked .check-icon {
  color: #fff;
  font-size: 14px;
  animation: checkPop 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.checkbox-label {
  line-height: 1.2;
}

.custom-checkbox-wrapper:focus-visible .checkbox-box {
  box-shadow: 0 0 0 3px var(--primary-transparent);
  border-color: var(--primary);
}

@keyframes checkPop {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}
.icon-wrapper { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
</style>
