<template>
  <aside class="sidebar-section">
    <div class="editor-panel global-panel" :style="{ flex: selectedItemIndex !== null ? `0 0 ${globalPanelHeight}px` : '1', minHeight: '150px' }">
      <div class="panel-header">
        <h2>Project Settings</h2>
      </div>
      <div class="panel-content" style="padding: 0; display: flex; flex-direction: column;">
        <div style="padding: 1.5rem; flex: 1;">
          
          <!-- Label Properties -->
          <div class="style-group">
            <div class="style-group-header">
              <Icon icon="mdi:ruler-square" class="header-icon" />
              <span>Label Properties</span>
            </div>
            <div class="control-row">
              <div class="control-group half">
                <label>Width (mm)</label>
                <NumberStepper v-model="labelWidth" :min="1" :max="100" :step="0.1" />
              </div>
              <div class="control-group half">
                <label>Height (mm)</label>
                <NumberStepper v-model="labelHeight" :min="1" :max="100" :step="0.1" />
              </div>
            </div>
            <div class="control-row" style="margin-top: 0.5rem">
              <div class="control-group">
                <label>Material</label>
                <CustomSelect 
                  v-model="labelMaterial" 
                  :options="[
                    { value: 'transparent', label: 'Transparent Film' },
                    { value: 'thin-paper', label: 'Thin Paper' },
                    { value: 'thick-paper', label: 'Thick Paper' }
                  ]"
                />
              </div>
            </div>
          </div>

          <!-- Default Label Styles -->
          <div class="style-group bordered-top">
            <div class="style-group-header">
              <Icon icon="mdi:palette-swatch-outline" class="header-icon" />
              <span>Default Label Styles</span>
            </div>
            
            <div class="control-row" style="margin-top: 0.5rem">
              <div class="control-group half">
                <label>Text Size (px)</label>
                <NumberStepper v-model="globalTextSize" :min="6" :max="32" :step="1" :defaultVal="10" />
              </div>
              <div class="control-group half">
                <label>Text Color</label>
                <ColorPicker v-model="globalTextColor" />
              </div>
            </div>

            <div class="control-row" style="margin-top: 0.5rem">
              <div class="control-group half">
                <label>Icon Size (px)</label>
                <NumberStepper v-model="globalIconSize" :min="10" :max="64" :step="1" :defaultVal="24" />
              </div>
              <div class="control-group half">
                <label>Icon Color</label>
                <ColorPicker v-model="globalIconColor" />
              </div>
            </div>
            
            <div class="control-row" style="margin-top: 0.5rem">
              <div class="control-group">
                <label>Background Color</label>
                <ColorPicker v-model="globalBackgroundColor" />
              </div>
            </div>

            <div class="control-row" style="margin-top: 0.5rem">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span style="font-size: 0.75rem; color: var(--text-muted);">Flatten icons to solid silhouette</span>
                <CustomSwitch v-model="globalIconFlatten" title="Forces complex/multi-colored icons into a flat shape" />
              </div>
            </div>
          </div>

          <!-- LocalDeck Hardware -->
          <div class="style-group bordered-top">
            <div class="style-group-header">
              <Icon icon="mdi:keyboard-variant" class="header-icon" />
              <span>LocalDeck Hardware</span>
            </div>
            
            <div class="control-row">
              <div class="control-group half">
                <label>Grid Columns</label>
                <NumberStepper v-model="matrixWidth" :min="1" :max="24" :step="1" />
              </div>
              <div class="control-group half">
                <label>Grid Rows</label>
                <NumberStepper v-model="matrixHeight" :min="1" :max="24" :step="1" />
              </div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
    <DragHandle v-if="selectedItemIndex !== null" @resize="onResize" />

    <div class="editor-panel detail-panel" v-if="selectedItemIndex !== null" style="flex: 1; min-height: 150px;">
      <div class="panel-header">
        <h2>Edit Label</h2>
        <div class="panel-actions">
          <button class="icon-btn" @click="duplicateSelected" title="Duplicate Label">
            <Icon icon="mdi:content-copy" />
          </button>
        </div>
      </div>
      
      <div class="panel-content" style="padding: 0; display: flex; flex-direction: column;">
        <div style="padding: 1.5rem; flex: 1;">
          <LabelEditor :label="labels[selectedItemIndex]" :key="labels[selectedItemIndex].id" />
          
          <div style="margin-top: 1.5rem;">
            <button class="primary" style="width: 100%; background: var(--danger); border-color: var(--danger); display: flex; align-items: center; justify-content: center; gap: 0.5rem;" @click="removeSelected">
              <Icon icon="mdi:trash-can-outline" /> Delete Label
            </button>
          </div>
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
import CustomSwitch from './CustomSwitch.vue'
import LabelEditor from './LabelEditor.vue'
import NumberStepper from './NumberStepper.vue'
import CustomSelect from './CustomSelect.vue'

const {
  globalTextSize,
  globalTextColor,
  globalIconSize,
  globalIconColor,
  globalIconFlatten,
  globalBackgroundColor,
  labelWidth,
  labelHeight,
  labelMaterial,
  matrixWidth,
  matrixHeight,
  selectedItemIndex,
  duplicateSelected,
  removeSelected,
  labels
} = useStore()

import { ref } from 'vue'
import DragHandle from './DragHandle.vue'

const globalPanelHeight = ref(400) // Default height in px

const onResize = (delta) => {
  const newHeight = globalPanelHeight.value + delta;
  
  // Clamp the height between sensible min and max (e.g. 150px and windowHeight - 300px)
  const minHeight = 150;
  const maxHeight = window.innerHeight - 300;
  
  globalPanelHeight.value = Math.max(minHeight, Math.min(newHeight, maxHeight));
}
</script>

<!-- Unscoped on purpose: these rules also style child components -->
<style>
.sidebar-section {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.global-panel {
  flex: none;
  height: auto;
}

.detail-panel {
  flex: 1;
  min-height: 0;
}

.editor-panel {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0,0,0,0.1);
}

.panel-header h2 {
  font-size: 1.1rem;
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: 0.25rem;
}

.panel-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}
</style>
