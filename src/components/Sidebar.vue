<template>
  <aside class="sidebar-section">
    <div class="editor-panel global-panel">
      <div class="panel-header">
        <h2>Global Styles</h2>
      </div>
      <div class="panel-content">
        <div class="style-group">
          <div class="style-group-header">
            <Icon icon="mdi:format-text" class="header-icon" />
            <span>Default Text Style</span>
          </div>
          <div class="control-row">
            <div class="control-group half">
              <label>Size (px)</label>
              <input type="number" v-model.number="globalTextSize" min="6" max="32" />
            </div>
            <div class="control-group half">
              <label>Color</label>
              <ColorPicker v-model="globalTextColor" />
            </div>
          </div>
        </div>

        <div class="style-group mt-3">
          <div class="style-group-header">
            <Icon icon="mdi:star-outline" class="header-icon" />
            <span>Default Icon Style</span>
          </div>
          <div class="control-row">
            <div class="control-group half">
              <label>Size (px)</label>
              <input type="number" v-model.number="globalIconSize" min="10" max="64" />
            </div>
            <div class="control-group half">
              <label>Color</label>
              <ColorPicker v-model="globalIconColor" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="editor-panel detail-panel" v-if="selectedItemIndex !== null">
      <div class="panel-header">
        <h2>Edit Label</h2>
        <div class="panel-actions">
          <button class="icon-btn" @click="duplicateSelected" title="Duplicate Label">
            <Icon icon="mdi:content-copy" />
          </button>
        </div>
      </div>
      
      <div class="panel-content">
        <LabelEditor v-model="labels[selectedItemIndex]" :key="labels[selectedItemIndex].id" />
        
        <div style="margin-top: 1.5rem;">
          <button class="primary" style="width: 100%; background: var(--danger); border-color: var(--danger); display: flex; align-items: center; justify-content: center; gap: 0.5rem;" @click="removeSelected">
            <Icon icon="mdi:trash-can-outline" /> Delete Label
          </button>
        </div>
      </div>
    </div>
    
    <div class="empty-state detail-panel" v-else>
      <Icon icon="mdi:cursor-default-click-outline" />
      <p>Select a label to edit its properties.</p>
    </div>
  </aside>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { useStore } from '../composables/useStore.js'
import ColorPicker from './ColorPicker.vue'
import LabelEditor from './LabelEditor.vue'

const {
  globalTextSize,
  globalTextColor,
  globalIconSize,
  globalIconColor,
  selectedItemIndex,
  duplicateSelected,
  removeSelected,
  labels
} = useStore()
</script>

<style scoped>
.style-group {
  margin-bottom: 0.5rem;
}
.style-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
  
}
.header-icon {
  font-size: 1rem;
  color: var(--primary);
}
.mt-3 {
  padding-top: 1rem;
  border-top: 1px solid var(--card-border);
  margin-top: 1rem;
}
</style>
