<template>
  <div class="number-stepper">
    <button class="stepper-btn" @click.prevent="increment"><Icon icon="mdi:chevron-up" /></button>
    <div class="stepper-value">{{ modelValue === null || modelValue === undefined ? defaultVal : modelValue }}</div>
    <button class="stepper-btn" @click.prevent="decrement"><Icon icon="mdi:chevron-down" /></button>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'

const props = defineProps({
  modelValue: { type: Number },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  defaultVal: { type: Number, default: 24 }
})

const emit = defineEmits(['update:modelValue'])

const increment = () => {
  let val = props.modelValue === null || props.modelValue === undefined ? props.defaultVal : props.modelValue
  if (val < props.max) {
    emit('update:modelValue', val + 1)
  }
}

const decrement = () => {
  let val = props.modelValue === null || props.modelValue === undefined ? props.defaultVal : props.modelValue
  if (val > props.min) {
    emit('update:modelValue', val - 1)
  }
}
</script>

<style scoped>
.number-stepper {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0,0,0,0.15);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  width: 42px;
  overflow: hidden;
}

.stepper-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 20px;
  transition: all 0.1s;
}

.stepper-btn:hover {
  background: rgba(255,255,255,0.1);
  color: var(--text-main);
}

.stepper-btn:active {
  background: rgba(255,255,255,0.2);
}

.stepper-value {
  font-size: 0.9rem;
  font-weight: 600;
  padding: 4px 0;
  color: var(--text-main);
  text-align: center;
  width: 100%;
  user-select: none;
}
</style>
