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
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #d97706;
}

.alert-info {
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #2563eb;
}

.alert-error {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #dc2626;
}

.alert-success {
  background-color: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #059669;
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .alert-warning { color: #fbbf24; }
  .alert-info { color: #60a5fa; }
  .alert-error { color: #f87171; }
  .alert-success { color: #34d399; }
}
</style>
