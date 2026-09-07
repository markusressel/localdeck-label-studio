<template>
  <div class="custom-select-wrapper">
    <div class="custom-select-trigger" @click.stop="toggle">
      <span class="trigger-label">{{ currentLabel }}</span>
      <Icon icon="mdi:chevron-down" :class="{ 'is-open': isOpen }" />
    </div>
    <div class="custom-select-dropdown" v-if="isOpen">
      <div 
        v-for="opt in options" 
        :key="opt.value" 
        class="custom-select-option" 
        :class="{ 'is-active': modelValue === opt.value }"
        @click.stop="select(opt.value)"
      >
        {{ opt.label }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { required: false },
  options: { type: Array, required: true }
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

const currentLabel = computed(() => {
  const val = props.modelValue === undefined ? null : props.modelValue
  const opt = props.options.find(o => o.value === val)
  return opt ? opt.label : (props.modelValue || 'Select...')
})

const toggle = () => {
  isOpen.value = !isOpen.value
}

const select = (val) => {
  emit('update:modelValue', val)
  isOpen.value = false
}

const closeDropdown = () => {
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})
onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<style scoped>
.custom-select-wrapper {
  position: relative;
  width: 100%;
}
.custom-select-trigger {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text);
  font-family: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  user-select: none;
}
.custom-select-trigger:hover {
  border-color: var(--primary);
}
.chevron {
  transition: transform 0.2s;
  color: var(--text-muted);
}
.chevron.is-open {
  transform: rotate(180deg);
}
.custom-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--card-bg);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
}
.custom-select-option {
  padding: 0.6rem 0.8rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.1s;
}
.custom-select-option:hover {
  background: var(--hover-bg);
}
.custom-select-option.is-active {
  background: var(--primary);
  color: white;
}
</style>
