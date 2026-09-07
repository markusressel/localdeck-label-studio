<template>
  <aside class="sidebar-section">
    <div class="editor-panel global-panel">
      <div class="panel-header">
        <h2>Global Styles</h2>
      </div>
      <div class="panel-content">
        <div class="control-row">
          <div class="control-group half">
            <label>Text Size (px)</label>
            <input type="number" v-model.number="globalTextSize" min="6" max="32" />
          </div>
          <div class="control-group half">
            <label>Text Color</label>
            <ColorPicker v-model="globalTextColor" />
          </div>
        </div>
        <div class="control-row mt-2">
          <div class="control-group half">
            <label>Icon Size (px)</label>
            <input type="number" v-model.number="globalIconSize" min="10" max="64" />
          </div>
          <div class="control-group half">
            <label>Icon Color</label>
            <ColorPicker v-model="globalIconColor" />
          </div>
        </div>
      </div>
    </div>

    <div class="editor-panel detail-panel" v-if="selectedItemIndex !== null">
      <div class="panel-header">
        <h2>Edit Label</h2>
        <div class="panel-actions">
          <button class="icon-btn" @click="duplicateSelected" title="Duplicate Label">
            <span class="iconify" data-icon="mdi:content-copy"></span>
          </button>
        </div>
      </div>
      
      <div class="panel-content">
        <LabelEditor v-model="labels[selectedItemIndex]" />
        
        <div style="margin-top: 1.5rem;">
          <button class="primary" style="width: 100%; background: var(--danger); border-color: var(--danger); display: flex; align-items: center; justify-content: center; gap: 0.5rem;" @click="removeSelected">
            <span class="iconify" data-icon="mdi:trash-can-outline"></span> Delete Label
          </button>
        </div>
      </div>
    </div>
    
    <div class="empty-state detail-panel" v-else>
      <span class="iconify empty-icon" data-icon="mdi:cursor-default-click-outline"></span>
      <p>Select a label to edit its properties.</p>
    </div>
  </aside>
</template>

<script setup>
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
