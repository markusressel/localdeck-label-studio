<template>
  <div class="number-stepper" @wheel.prevent="handleWheel">
    <button class="stepper-btn" @click.prevent="increment"><Icon icon="mdi:chevron-up" /></button>
    <input 
      class="stepper-value" 
      type="number" 
      :value="modelValue === null || modelValue === undefined ? defaultVal : modelValue"
      @input="onInput"
      @blur="onBlur"
    />
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

const handleWheel = (e) => {
  if (e.deltaY < 0) increment()
  else if (e.deltaY > 0) decrement()
}

const onInput = (e) => {
  let val = parseInt(e.target.value, 10)
  if (isNaN(val)) return
  // Don't clamp on input so they can type freely, or clamp?
  // Let's emit directly to allow typing
  emit('update:modelValue', val)
}

const onBlur = (e) => {
  let val = parseInt(e.target.value, 10)
  if (isNaN(val)) {
    emit('update:modelValue', props.defaultVal)
    return
  }
  if (val < props.min) val = props.min
  if (val > props.max) val = props.max
  emit('update:modelValue', val)
  e.target.value = val
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
  background: transparent;
  border: none;
  font-family: inherit;
  -moz-appearance: textfield;
}
.stepper-value:focus { outline: none; }
.stepper-value::-webkit-inner-spin-button, 
.stepper-value::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
