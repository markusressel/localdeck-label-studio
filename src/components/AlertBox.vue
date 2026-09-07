<template>
  <div class="alert-box" :class="`alert-${type}`">
    <div class="alert-icon">
      <span class="iconify" :data-icon="iconName"></span>
    </div>
    <div class="alert-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'warning', // warning, info, error, success
  }
})

const iconName = computed(() => {
  switch (props.type) {
    case 'warning': return 'mdi:alert-outline'
    case 'info': return 'mdi:information-outline'
    case 'error': return 'mdi:alert-circle-outline'
    case 'success': return 'mdi:check-circle-outline'
    default: return 'mdi:alert-outline'
  }
})
</script>

<style scoped>
.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.alert-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-warning {
  background-color: rgba(245, 158, 11, 0.1); /* fallback/raw amber */
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: var(--amber-600);
}

.alert-info {
  background-color: rgba(59, 130, 246, 0.1); /* fallback/raw blue */
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: var(--blue-600);
}

.alert-error {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--red-600);
}

.alert-success {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: var(--emerald-600);
}

/* Dark mode adjustments (Since we default to dark mode, we can use lighter text colors) */
.alert-warning { color: var(--amber-400); }
.alert-info { color: var(--blue-400); }
.alert-error { color: var(--red-400); }
.alert-success { color: var(--emerald-400); }
</style>
